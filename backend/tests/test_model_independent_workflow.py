"""Assertion-based tests proving model-independent operation and Gemini error fallback.

Covers:
- Task 5.1: Known-PDF workflow with all remote model extraction disabled:
  readiness, upload, deterministic patrols, RFI draft/approval, simulation, reviewer action, activity.
- Task 5.2: Optional Gemini failure handling (timeout, quota, invalid output)
  falling back gracefully to deterministic evidence with unresolved facts flagged.
"""

import os
import shutil
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

class TestModelIndependentWorkflow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_dir = tempfile.mkdtemp(prefix="po_lice_model_test_")
        os.environ["PO_LICE_DATA_DIR"] = cls.test_dir
        os.environ["OLLAMA_ENABLED"] = "false"
        os.environ["REMOTE_EXTRACTION_ENABLED"] = "false"

        from main import app
        from scripts.seed_demo_data import generate_upload_fixture
        cls.client = TestClient(app)
        cls.pdf_path = generate_upload_fixture(verbose=False)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.test_dir, ignore_errors=True)

    def test_5_1_known_pdf_workflow_without_models(self):
        """Complete workflow passes with remote extraction disabled."""
        # 1. Readiness check
        r = self.client.get("/api/v1/readiness")
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["status"], "healthy")
        self.assertEqual(body["persistence"], "sqlite")

        # 2. Upload synthetic PDF fixture
        with open(self.pdf_path, "rb") as f:
            r = self.client.post(
                "/api/v1/bids/upload",
                files={"file": ("DemoUpload_SyntheticBid.pdf", f, "application/pdf")},
                headers={"Idempotency-Key": "TEST-MODEL-INDEPENDENT-01"},
            )
        self.assertEqual(r.status_code, 200, r.text)
        bid = r.json()
        bid_id = bid["id"]

        self.assertIn("Acme", bid["source"]["vendor_name"])
        self.assertEqual(bid["source"]["equipment"]["model_number"], "ACME-900")
        self.assertIsNotNone(bid["scorecard"]["recommendation"])
        self.assertGreaterEqual(len(bid["scorecard"]["patrol_results"]), 4)

        # 3. Download source PDF
        r = self.client.get(f"/api/v1/bids/{bid_id}/source")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.headers["content-type"], "application/pdf")

        # 4. Generate RFI draft
        r = self.client.post("/api/v1/agent/rfi-draft", json={"bid_id": bid_id})
        self.assertEqual(r.status_code, 200)
        rfi = r.json()
        rfi_id = rfi["rfi_id"]
        self.assertEqual(rfi["status"], "DRAFT")
        self.assertFalse(rfi["human_reviewed"])

        # 5. Approve RFI draft
        r = self.client.patch(
            f"/api/v1/rfis/{rfi_id}/approve",
            json={"edited_text": rfi["rfi_text"], "note": "Approved by officer"},
        )
        self.assertEqual(r.status_code, 200)
        approved_rfi = r.json()
        self.assertEqual(approved_rfi["status"], "APPROVED")
        self.assertTrue(approved_rfi["human_reviewed"])

        # 6. Run simulation
        r = self.client.post(
            "/api/v1/bids/simulate",
            json={"base_capex_inr": 40_000_000, "discount_percent": 5, "delay_days": 10},
        )
        self.assertEqual(r.status_code, 200)
        sim = r.json()
        self.assertGreater(sim["calculated_tco2_inr"], 0)

        # 7. Record reviewer action
        r = self.client.post(
            f"/api/v1/bids/{bid_id}/actions",
            json={"action": "REVIEWED_READY_FOR_DECISION", "note": "All checks verified"},
        )
        self.assertEqual(r.status_code, 200)
        action_event = r.json()
        self.assertEqual(action_event["bid_id"], bid_id)

        # 8. Verify activity log
        r = self.client.get(f"/api/v1/activity?bid_id={bid_id}")
        self.assertEqual(r.status_code, 200)
        activity = r.json()
        self.assertGreaterEqual(len(activity), 1)

    def test_5_2_gemini_failure_fallback_leaves_unresolved_facts_flagged(self):
        """When optional Gemini fails (error/timeout), deterministic evidence is preserved and missing facts become FLAG."""
        from app.models.schemas import FactField
        from app.services.model_extraction import (
            ExtractionCascade,
            ExtractionSettings,
            ProviderRequestError,
        )
        from app.services.extractor import PDFExtractorService
        from app.services.patrols import PatrolEngineService

        # Document missing equipment width
        incomplete_text = (
            "[SYNTHETIC DEMO DATA]\nVENDOR: Partial Vendor\nUpfront Bid Amount: INR 4,00,00,000\n"
            "Promised Delivery: 10 Weeks\nOSHA Certified: Yes\nEquipment Model: PARTIAL-1\n"
            "Substation Power Draw: 1100 kW\nEmbodied Carbon Factor: 400 kgCO2e/ton"
        )
        parsed_bid = PDFExtractorService.parse_bid_text(incomplete_text)

        class FailingGeminiExtractor:
            def extract(self, text, requested_fields):
                raise ProviderRequestError("Gemini API quota exceeded / timeout")

        settings = ExtractionSettings(
            ollama_enabled=False,
            ollama_base_url="http://localhost:11434",
            ollama_model="mistral",
            deadline_seconds=5.0,
            remote_enabled=True,
            remote_project_ids=frozenset({"PRJ-AMBER-01"}),
            gemini_api_key="mock-key",
            gemini_model="gemini-test",
        )

        cascade = ExtractionCascade(settings, gemini=FailingGeminiExtractor())
        enriched = cascade.enrich(incomplete_text, parsed_bid, "PRJ-AMBER-01")

        # Missing field (width) remains None
        self.assertIsNone(enriched.equipment.width_m)
        self.assertIn("GEMINI_UNAVAILABLE", [i.code for i in enriched.extraction_report.issues])

        # Patrol engine evaluates incomplete bid as FLAG, not inferred PASS
        scorecard = PatrolEngineService.run_all_patrols(enriched)
        building_patrol = next(p for p in scorecard.patrol_results if p.patrol_name == "BUILDING_PATROL")
        self.assertEqual(building_patrol.status, "FLAG")
        self.assertIn("INSUFFICIENT_EVIDENCE", building_patrol.rule_broken)


if __name__ == "__main__":
    unittest.main()
