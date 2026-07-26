"""HTTP contract checks for state changes and the persisted RFI workflow."""

import os
import shutil
import tempfile
import unittest

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
        api.bid_repository = BidRepository()
        api.DEMO_MODE = True
        self.client = TestClient(api.app)

    def tearDown(self):
        self.client.close()
        api.bid_repository = self.original_repository
        api.DEMO_MODE = self.original_demo_mode
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
        return api.bid_repository.save_bid("api.pdf", b"%PDF-1.4 API", source, scorecard)

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
        updated = self.client.put(
            "/api/v1/site-constraints",
            json={
                "expected_version": 1,
                "max_substation_kw": 1_500,
                "max_door_width_m": 2.1,
                "max_embodied_carbon_kg": 400,
                "reason": "Verified demo constraint update",
            },
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["new_version"], 2)

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
