"""Unit tests for BidRepository, SQLite durability, state transitions, RFIs, and constraints."""

import os
import shutil
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from app.models.schemas import (
    EquipmentSpec,
    OfficerDecision,
    VendorBidExtract,
)
from app.services.integrity import BidIntegrityService
from app.services.patrols import PatrolEngineService
from app.services.repository import BidRepository, InvalidTransitionError, StaleVersionError
from app.services.rfi import RFIService


class TestBidRepository(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="po_lice_repo_test_")
        os.environ["PO_LICE_DATA_DIR"] = self.test_dir
        self.repo = BidRepository()

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)
        os.environ.pop("PO_LICE_DATA_DIR", None)

    def _sample_bid(self):
        source = VendorBidExtract(
            vendor_id="VENDOR-ACME",
            vendor_name="Acme Chiller Corp",
            bid_amount_inr=42_000_000.0,
            promised_delivery_weeks=10,
            has_osha_cert=True,
            equipment=EquipmentSpec(
                equipment_type="Chiller",
                manufacturer="Acme",
                model_number="ACME-5000",
                power_draw_kw=1000.0,
                width_m=1.8,
                embodied_carbon_factor=400.0,
            ),
        )
        scorecard = PatrolEngineService.run_all_patrols(source)
        return source, scorecard

    def test_bid_save_get_list_delete(self):
        source, scorecard = self._sample_bid()
        content = b"%PDF-1.4 Mock PDF Content for Acme"

        saved = self.repo.save_bid("acme_bid.pdf", content, source, scorecard)
        self.assertIsNotNone(saved.id)
        self.assertEqual(saved.filename, "acme_bid.pdf")
        self.assertEqual(saved.scorecard.bid_id, saved.id)
        self.assertEqual(saved.officer_decision, OfficerDecision.UNDECIDED)
        self.assertEqual(saved.version, 1)

        fetched = self.repo.get_bid(saved.id)
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.id, saved.id)
        self.assertEqual(fetched.source.vendor_name, "Acme Chiller Corp")

        bids = self.repo.list_bids()
        self.assertEqual(len(bids), 1)

        source_path = self.repo.source_path(saved.id)
        self.assertIsNotNone(source_path)
        self.assertTrue(source_path.exists())

        deleted = self.repo.remove_bid(saved.id)
        self.assertTrue(deleted)
        self.assertIsNone(self.repo.get_bid(saved.id))
        self.assertFalse(source_path.exists())

    def test_source_provenance_is_immutable_and_idempotency_is_project_scoped(self):
        source, scorecard = self._sample_bid()
        contents = b"%PDF-1.4 immutable source bytes"
        first = self.repo.save_bid(
            "first.pdf",
            contents,
            source,
            scorecard,
            project_id="PROJECT-A",
            uploader_identity="OFFICER-A",
            idempotency_key="retry-1",
        )
        replay = self.repo.save_bid(
            "ignored.pdf",
            b"%PDF-1.4 different retry bytes",
            source,
            scorecard,
            project_id="PROJECT-A",
            uploader_identity="OFFICER-A",
            idempotency_key="retry-1",
        )
        self.assertEqual(replay.id, first.id)
        self.assertEqual(self.repo.source_path(first.id).read_bytes(), contents)
        self.assertEqual(first.source_document.byte_length, len(contents))
        self.assertEqual(first.source_document.project_id, "PROJECT-A")
        self.assertEqual(first.source_document.sha256, first.source.pdf_fingerprint)

        other_project = self.repo.save_bid(
            "other.pdf",
            contents,
            source,
            scorecard,
            project_id="PROJECT-B",
            uploader_identity="OFFICER-A",
            idempotency_key="retry-1",
        )
        self.assertNotEqual(other_project.id, first.id)

        with self.assertRaises(sqlite3.IntegrityError):
            with self.repo._connect() as connection:
                connection.execute(
                    "UPDATE bids SET filename = ? WHERE id = ?",
                    ("altered.pdf", first.id),
                )

    def test_officer_decision_persistence_and_concurrency(self):
        source, scorecard = self._sample_bid()
        saved = self.repo.save_bid("test.pdf", b"%PDF-1.4 Data", source, scorecard)

        # Successful update from version 1 -> 2
        updated = self.repo.update_officer_decision(
            bid_id=saved.id,
            decision=OfficerDecision.AWARDED,
            expected_version=1,
            actor="OFFICER_JOHN",
            reason="Lowest TCO and compliant",
        )
        self.assertEqual(updated.officer_decision, OfficerDecision.AWARDED)
        self.assertEqual(updated.version, 2)

        # Stale update with expected_version=1 must raise StaleVersionError
        with self.assertRaises(StaleVersionError):
            self.repo.update_officer_decision(
                bid_id=saved.id,
                decision=OfficerDecision.REJECTED,
                expected_version=1,  # Stale!
                actor="OFFICER_JANE",
                reason="Stale update attempt",
            )

        with self.assertRaises(InvalidTransitionError):
            self.repo.update_officer_decision(
                bid_id=saved.id,
                decision=OfficerDecision.REJECTED,
                expected_version=2,
                actor="OFFICER_JANE",
                reason="Awarded decisions are final in the prototype",
            )

        # Activity log event recorded for decision change
        activities = self.repo.activity(saved.id)
        decision_events = [a for a in activities if "DECISION_CHANGE_AWARDED" in a.action]
        self.assertEqual(len(decision_events), 1)
        self.assertIn("OFFICER_JOHN: Lowest TCO", decision_events[0].evidence)

    def test_rfi_workflow_generation_and_approval(self):
        source, scorecard = self._sample_bid()
        saved = self.repo.save_bid("rfi_test.pdf", b"%PDF-1.4 Data", source, scorecard)

        draft_data = RFIService.generate_rfi_draft(scorecard)
        draft = self.repo.save_rfi_draft(
            bid_id=saved.id,
            vendor_name=draft_data["vendor_name"],
            rfi_text=draft_data["rfi_text"],
            protected_facts=draft_data["protected_facts"],
        )

        self.assertIsNotNone(draft.rfi_id)
        self.assertEqual(draft.status, "DRAFT")
        self.assertFalse(draft.human_reviewed)

        fetched = self.repo.get_rfi(draft.rfi_id)
        self.assertEqual(fetched.rfi_id, draft.rfi_id)
        self.assertEqual(fetched.status, "DRAFT")

        # Separate approval action
        approved = self.repo.approve_rfi(
            rfi_id=draft.rfi_id,
            edited_text=draft.rfi_text,
            actor="OFFICER_SARAH",
            note="Approved for vendor delivery",
        )
        self.assertEqual(approved.status, "APPROVED")
        self.assertTrue(approved.human_reviewed)

        # Re-approving raises ValueError (not in DRAFT status)
        with self.assertRaises(ValueError):
            self.repo.approve_rfi(
                draft.rfi_id,
                edited_text=draft.rfi_text,
                actor="OFFICER_SARAH",
                note="Double approve",
            )

        violations = RFIService.validate_edited_text(
            draft.rfi_text.replace("Acme Chiller Corp", "Different Vendor"),
            draft.protected_facts,
        )
        self.assertTrue(violations)
        self.assertTrue(
            RFIService.validate_edited_text(
                f"{draft.rfi_text}\nRECOMMENDATION: REJECT",
                draft.protected_facts,
            )
        )

    def test_constraint_versioning_and_concurrency(self):
        initial = self.repo.get_current_constraints("PRJ-AMBER-01")
        self.assertIsNotNone(initial)
        self.assertEqual(initial.version, 1)

        # Update constraint 1 -> 2
        updated = self.repo.update_constraints(
            expected_version=1,
            max_substation_kw=1500.0,
            max_door_width_m=2.1,
            max_embodied_carbon_kg=400.0,
            max_water_evap_gpm=30.0,
            max_floor_load_kg_m2=2500.0,
            actor="ADMIN_ALICE",
            reason="Substation capacity expansion",
        )
        self.assertEqual(updated.version, 2)
        self.assertEqual(updated.max_substation_kw, 1500.0)
        self.assertEqual(updated.max_water_evap_gpm, 30.0)
        self.assertEqual(updated.max_floor_load_kg_m2, 2500.0)

        # Current constraint is version 2
        current = self.repo.get_current_constraints("PRJ-AMBER-01")
        self.assertEqual(current.version, 2)

        # Stale update with version 1 fails
        with self.assertRaises(StaleVersionError):
            self.repo.update_constraints(
                expected_version=1,
                max_substation_kw=1800.0,
                max_door_width_m=2.5,
                max_embodied_carbon_kg=350.0,
                actor="ADMIN_BOB",
                reason="Stale update",
            )

    def test_existing_constraint_database_adds_new_optional_limits(self):
        with self.repo._connect() as connection:
            connection.execute("DROP TABLE site_constraints")
            connection.executescript("""
                CREATE TABLE site_constraints (
                  id TEXT PRIMARY KEY,
                  project_id TEXT NOT NULL,
                  version INTEGER NOT NULL,
                  is_current INTEGER NOT NULL,
                  max_substation_kw REAL NOT NULL,
                  max_door_width_m REAL NOT NULL,
                  max_embodied_carbon_kg REAL NOT NULL,
                  actor TEXT NOT NULL,
                  reason TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  UNIQUE (project_id, version)
                );
                INSERT INTO site_constraints VALUES (
                  'legacy', 'PRJ-AMBER-01', 1, 1, 1200.0, 1.9, 450.0,
                  'SYSTEM', 'Legacy baseline', '2026-01-01T00:00:00+00:00'
                );
            """)

        upgraded = BidRepository().get_current_constraints()
        self.assertIsNone(upgraded.max_water_evap_gpm)
        self.assertIsNone(upgraded.max_floor_load_kg_m2)

    def test_failed_bid_transaction_removes_source_file(self):
        source, scorecard = self._sample_bid()
        with patch.object(self.repo, "_append", side_effect=RuntimeError("audit write failed")):
            with self.assertRaises(RuntimeError):
                self.repo.save_bid("failed.pdf", b"%PDF-1.4 Data", source, scorecard)

        self.assertEqual(self.repo.list_bids(), [])
        self.assertEqual(list(self.repo.uploads_path.iterdir()), [])

    def test_exact_byte_fingerprint_correlation(self):
        service = BidIntegrityService()
        fingerprint = service.compute_sha256(b"%PDF-1.4 exact bytes")
        different_fingerprint = service.compute_sha256(b"%PDF-1.4 exact bytes ")
        self.assertNotEqual(fingerprint, different_fingerprint)

        source, _ = self._sample_bid()
        first = source.model_copy(update={"vendor_id": "VENDOR-FIRST", "pdf_fingerprint": fingerprint})
        second = source.model_copy(update={"vendor_id": "VENDOR-SECOND", "pdf_fingerprint": fingerprint})
        service.record(first)

        self.assertEqual(
            service.correlations(second)["pdf_fingerprint"],
            ["VENDOR-FIRST"],
        )


if __name__ == "__main__":
    unittest.main()
