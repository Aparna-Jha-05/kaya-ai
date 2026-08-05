"""HTTP contract checks for state changes and the persisted RFI workflow."""

import os
import shutil
import tempfile
import unittest

import fitz
from fastapi.testclient import TestClient
from pydantic import ValidationError

import main as api
from app.db.supabase import DatabaseSettings
from app.models.schemas import EquipmentSpec, VendorBidExtract
from app.services.patrols import ConstraintGraph, PatrolEngineService
from app.services.repository import BidRepository


class ApiContractTests(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="po_lice_api_test_")
        os.environ["PO_LICE_DATA_DIR"] = self.test_dir
        self.original_repository = api.bid_repository
        self.original_demo_mode = api.DEMO_MODE
        self.original_public_read_only = api.PUBLIC_READ_ONLY
        api.bid_repository = BidRepository()
        api.DEMO_MODE = True
        api.PUBLIC_READ_ONLY = False
        self.client = TestClient(api.app)

    def tearDown(self):
        self.client.close()
        api.bid_repository = self.original_repository
        api.DEMO_MODE = self.original_demo_mode
        api.PUBLIC_READ_ONLY = self.original_public_read_only
        os.environ.pop("PO_LICE_DATA_DIR", None)
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def _saved_bid(self):
        source = VendorBidExtract(
            vendor_id="VENDOR-API",
            vendor_name="API Test Vendor",
            bid_amount_inr=42_000_000,
            promised_delivery_weeks=10,
            has_osha_cert=True,
            equipment=EquipmentSpec(
                equipment_type="Chiller",
                manufacturer="API Test Vendor",
                model_number="API-1",
                power_draw_kw=1_000,
                width_m=1.8,
                embodied_carbon_factor=400,
            ),
        )
        scorecard = PatrolEngineService.run_all_patrols(source, graph=ConstraintGraph())
        return api.bid_repository.save_bid("api.pdf", b"%PDF-1.4 API", source, scorecard, project_id=api.PROJECT_ID)

    @staticmethod
    def _pdf_bid(include_width: bool = True) -> bytes:
        document = fitz.open()
        page = document.new_page(width=612, height=792)
        width_line = "Equipment Width: 1.8 m\n" if include_width else ""
        page.insert_text(
            (72, 72),
            "VENDOR: Evidence Test Vendor\n"
            "Equipment Model: EV-1\n"
            "Upfront Bid Amount: INR 42,000,000\n"
            "Promised Delivery: 10 Weeks\n"
            "OSHA Certified: Yes\n"
            "Substation Power Draw: 1000 kW\n"
            "Cooling Capacity: 1200 kW\n"
            f"{width_line}"
            "Embodied Carbon Factor: 400 kgCO2e/ton",
        )
        document.set_metadata(
            {
                "producer": "PO-LICE test fixture",
                "creationDate": "D:20260102000000Z",
                "modDate": "D:20250101000000Z",
            }
        )
        contents = document.tobytes()
        document.close()
        return contents

    def test_upload_provenance_idempotency_and_evidence_regions(self):
        contents = self._pdf_bid()
        first = self.client.post(
            "/api/v1/bids/upload",
            headers={"Idempotency-Key": "upload-contract-1"},
            files={"file": ("evidence.pdf", contents, "application/pdf")},
        )
        self.assertEqual(first.status_code, 200)
        record = first.json()
        self.assertEqual(record["source_document"]["byte_length"], len(contents))
        self.assertEqual(record["source_document"]["project_id"], api.PROJECT_ID)
        self.assertEqual(len(record["source_document"]["sha256"]), 64)
        self.assertIn(
            "MODIFICATION_BEFORE_CREATION",
            record["source"]["document_metadata"]["review_signals"],
        )

        annotation = record["source"]["extraction_report"]["dimension_annotations"][0]
        self.assertEqual(annotation["field"], "equipment.width_m")
        self.assertEqual(annotation["unit"], "m")
        self.assertEqual(annotation["page"], 1)
        self.assertEqual(annotation["page_rotation"], 0)
        self.assertEqual(annotation["coordinate_system"], "PYMUPDF_PAGE_SPACE_TOP_LEFT_POINTS")
        self.assertEqual(len(annotation["bbox"]), 4)
        self.assertGreater(annotation["page_width"], 0)
        self.assertGreater(annotation["page_height"], 0)

        replay = self.client.post(
            "/api/v1/bids/upload",
            headers={"Idempotency-Key": "upload-contract-1"},
            files={"file": ("retry.pdf", contents, "application/pdf")},
        )
        self.assertEqual(replay.status_code, 200)
        self.assertEqual(replay.json()["id"], record["id"])
        self.assertEqual(len(api.bid_repository.list_bids()), 1)

        duplicate = self.client.post(
            "/api/v1/bids/upload",
            headers={"Idempotency-Key": "upload-contract-2"},
            files={"file": ("duplicate.pdf", contents, "application/pdf")},
        )
        self.assertEqual(duplicate.status_code, 200)
        self.assertNotEqual(duplicate.json()["id"], record["id"])
        self.assertIn(
            f"DUPLICATE_BYTES:{record['id']}",
            duplicate.json()["source_document"]["integrity_signals"],
        )

        unsupported = self.client.post(
            "/api/v1/bids/upload",
            headers={"Idempotency-Key": "upload-contract-3"},
            files={
                "file": (
                    "no-width.pdf",
                    self._pdf_bid(include_width=False),
                    "application/pdf",
                )
            },
        )
        self.assertEqual(unsupported.status_code, 200)
        report = unsupported.json()["source"]["extraction_report"]
        self.assertEqual(report["dimension_annotations"], [])
        self.assertIn(
            "DIMENSION_ANNOTATION_UNAVAILABLE",
            [issue["code"] for issue in report["issues"]],
        )

    def test_officer_decision_payload_and_conflict(self):
        bid = self._saved_bid()
        response = self.client.patch(
            f"/api/v1/bids/{bid.id}/status",
            json={
                "decision": "AWARDED",
                "expected_version": 1,
                "reason": "Approved after review",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["officer_decision"], "AWARDED")
        self.assertEqual(response.json()["version"], 2)

        stale = self.client.patch(
            f"/api/v1/bids/{bid.id}/status",
            json={
                "decision": "REJECTED",
                "expected_version": 1,
                "reason": "Stale reviewer screen",
            },
        )
        self.assertEqual(stale.status_code, 409)

    def test_public_demo_blocks_privileged_mutations(self):
        bid = self._saved_bid()
        draft = self.client.post("/api/v1/agent/rfi-draft", json={"bid_id": bid.id}).json()
        api.PUBLIC_READ_ONLY = True

        responses = [
            self.client.patch(
                f"/api/v1/bids/{bid.id}/status",
                json={
                    "decision": "AWARDED",
                    "expected_version": 1,
                    "reason": "Public visitor must not decide",
                },
            ),
            self.client.post(
                f"/api/v1/bids/{bid.id}/actions",
                json={"action": "REVIEWED_READY_FOR_DECISION", "note": "Public visitor must not review"},
            ),
            self.client.patch(
                f"/api/v1/rfis/{draft['rfi_id']}/approve",
                json={"edited_text": draft["rfi_text"], "note": "Public visitor must not approve"},
            ),
            self.client.put(
                "/api/v1/site-constraints",
                json={
                    "expected_version": 1,
                    "max_substation_kw": 900,
                    "max_door_width_m": 2.1,
                    "max_embodied_carbon_kg": 400,
                    "reason": "Public visitor must not administer constraints",
                },
            ),
        ]

        self.assertEqual([response.status_code for response in responses], [403, 403, 403, 403])
        self.assertTrue(all("public demo" in response.json()["detail"].lower() for response in responses))

    def test_delete_requires_matching_upload_capability(self):
        upload = self.client.post(
            "/api/v1/bids/upload",
            headers={"Idempotency-Key": "delete-capability-1"},
            files={"file": ("evidence.pdf", self._pdf_bid(), "application/pdf")},
        )
        self.assertEqual(upload.status_code, 200)
        bid_id = upload.json()["id"]

        self.assertEqual(self.client.delete(f"/api/v1/bids/{bid_id}").status_code, 403)
        self.assertEqual(
            self.client.delete(
                f"/api/v1/bids/{bid_id}",
                headers={"Idempotency-Key": "wrong-capability"},
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.delete(
                f"/api/v1/bids/{bid_id}",
                headers={"Idempotency-Key": "delete-capability-1"},
            ).status_code,
            204,
        )
        self.assertIsNone(api.bid_repository.get_bid(bid_id))

    def test_rfi_uses_repository_bid_id_and_validates_edits(self):
        bid = self._saved_bid()
        generated = self.client.post("/api/v1/agent/rfi-draft", json={"bid_id": bid.id})
        self.assertEqual(generated.status_code, 200)
        draft = generated.json()
        self.assertEqual(draft["bid_id"], bid.id)
        self.assertIn(bid.id, draft["rfi_text"])

        altered = draft["rfi_text"].replace("API Test Vendor", "Different Vendor")
        rejected = self.client.patch(
            f"/api/v1/rfis/{draft['rfi_id']}/approve",
            json={"edited_text": altered, "note": "Approve altered draft"},
        )
        self.assertEqual(rejected.status_code, 409)

        approved = self.client.patch(
            f"/api/v1/rfis/{draft['rfi_id']}/approve",
            json={"edited_text": draft["rfi_text"], "note": "Approved after review"},
        )
        self.assertEqual(approved.status_code, 200)
        self.assertEqual(approved.json()["status"], "APPROVED")
        self.assertTrue(approved.json()["human_reviewed"])

    def test_constraint_update_requires_current_version(self):
        bid = self._saved_bid()
        decided = self.client.patch(
            f"/api/v1/bids/{bid.id}/status",
            json={
                "decision": "AWARDED",
                "expected_version": 1,
                "reason": "Approved before constraint revision",
            },
        )
        self.assertEqual(decided.status_code, 200)

        updated = self.client.put(
            "/api/v1/site-constraints",
            json={
                "expected_version": 1,
                "max_substation_kw": 900,
                "max_door_width_m": 2.1,
                "max_embodied_carbon_kg": 400,
                "reason": "Verified demo constraint update",
            },
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["new_version"], 2)
        self.assertEqual(updated.json()["reassessed_bid_count"], 1)

        reassessed = self.client.get(f"/api/v1/bids/{bid.id}")
        self.assertEqual(reassessed.status_code, 200)
        record = reassessed.json()
        self.assertEqual(record["officer_decision"], "AWARDED")
        self.assertEqual(record["version"], 2)
        self.assertEqual(record["assessment_version"], 2)
        self.assertEqual(
            [item["constraint_version"] for item in record["assessment_history"]],
            [2, 1],
        )
        self.assertEqual(
            record["assessment_history"][0]["scorecard"]["patrol_results"][0]["status"],
            "FAIL",
        )
        self.assertEqual(
            record["assessment_history"][1]["scorecard"]["patrol_results"][0]["status"],
            "FLAG",
        )
        events = self.client.get(f"/api/v1/activity?bid_id={bid.id}").json()
        self.assertIn("ASSESSMENT_CHANGED", [event["action"] for event in events])

        stale = self.client.put(
            "/api/v1/site-constraints",
            json={
                "expected_version": 1,
                "max_substation_kw": 1_600,
                "max_door_width_m": 2.2,
                "max_embodied_carbon_kg": 390,
                "reason": "Stale constraint update",
            },
        )
        self.assertEqual(stale.status_code, 409)

    def test_non_demo_mode_reports_persistence_unavailable(self):
        api.DEMO_MODE = False
        response = self.client.get("/api/v1/readiness")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "unhealthy")
        self.assertEqual(response.json()["persistence"], "unavailable")

        blocked = self.client.patch(
            "/api/v1/bids/missing/status",
            json={
                "decision": "REJECTED",
                "expected_version": 1,
                "reason": "Must not write through SQLite",
            },
        )
        self.assertEqual(blocked.status_code, 503)

    def test_database_settings_fail_closed(self):
        with self.assertRaises(ValidationError):
            DatabaseSettings(demo_mode=False, supabase_database_url="https://example.com")
        with self.assertRaises(ValidationError):
            DatabaseSettings(
                demo_mode=True,
                db_pool_min_size=5,
                db_pool_max_size=2,
            )


if __name__ == "__main__":
    unittest.main()
