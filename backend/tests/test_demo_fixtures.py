"""Assertion-based tests for competition demo narrative fixtures.

Verifies:
- Stable unique identifiers across re-seeding
- Expected recommendations (RECOMMENDED, REVIEW_REQUIRED, REJECT)
- Expected decisive patrol statuses
- Rejected bid is the lowest-price option
- Synthetic labels present in every fixture
- Idempotency — re-seeding never creates duplicates
"""

import os
import shutil
import tempfile
import unittest

from scripts.seed_demo_data import (
    FIXTURES,
    seed,
    generate_upload_fixture,
)
from app.services.repository import BidRepository, bid_repository


class TestDemoFixtures(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.results = seed(verbose=False)
        cls.repo = bid_repository

    def test_three_fixtures_created(self):
        self.assertEqual(len(self.results), 3)

    def test_unique_stable_identifiers(self):
        ids = [r["id"] for r in self.results]
        self.assertEqual(len(set(ids)), 3, f"Fixture IDs not unique: {ids}")

    def test_expected_recommendations(self):
        for result in self.results:
            expected = FIXTURES[result["key"]]["expected_recommendation"]
            self.assertEqual(
                result["recommendation"], expected,
                f"{result['key']}: expected {expected}, got {result['recommendation']}",
            )

    def test_expected_vendor_names(self):
        for result in self.results:
            expected_vendor = FIXTURES[result["key"]]["expected_vendor"]
            self.assertIn(expected_vendor, result["vendor"])

    def test_trane_recommended_all_patrols_pass_or_flag(self):
        """RECOMMENDED bid must have no FAIL patrols."""
        trane = next(r for r in self.results if "TRANE" in r["key"])
        record = self.repo.get_bid(trane["id"])
        self.assertIsNotNone(record)
        self.assertEqual(record.scorecard.recommendation, "RECOMMENDED")
        for patrol in record.scorecard.patrol_results:
            self.assertNotEqual(patrol.status, "FAIL",
                f"RECOMMENDED bid has FAIL patrol: {patrol.patrol_name}")

    def test_cooltech_rejected_has_hard_failure(self):
        """REJECT bid must have at least one FAIL patrol."""
        cooltech = next(r for r in self.results if "COOLTECH" in r["key"])
        record = self.repo.get_bid(cooltech["id"])
        self.assertIsNotNone(record)
        self.assertEqual(record.scorecard.recommendation, "REJECT")
        fail_patrols = [p for p in record.scorecard.patrol_results if p.status == "FAIL"]
        self.assertGreater(len(fail_patrols), 0, "Rejected bid has no FAIL patrols")

    def test_rejected_bid_is_lowest_price(self):
        """The REJECT fixture must be the cheapest bid."""
        reject = next(r for r in self.results if r["recommendation"] == "REJECT")
        reject_record = self.repo.get_bid(reject["id"])
        reject_price = reject_record.source.bid_amount_inr
        self.assertIsNotNone(reject_price)

        for result in self.results:
            if result["id"] == reject["id"]:
                continue
            other = self.repo.get_bid(result["id"])
            other_price = other.source.bid_amount_inr
            self.assertIsNotNone(other_price)
            self.assertLess(reject_price, other_price,
                f"Rejected bid (₹{reject_price:,.0f}) is not cheaper than {result['vendor']} (₹{other_price:,.0f})")

    def test_synthetic_labels_present(self):
        """Every fixture source should contain synthetic labeling."""
        for result in self.results:
            record = self.repo.get_bid(result["id"])
            source_path = self.repo.source_path(result["id"])
            self.assertIsNotNone(source_path)
            self.assertTrue(source_path.exists())

    def test_idempotency_no_duplicates(self):
        """Re-seeding produces the same results with the same IDs."""
        second_results = seed(verbose=False)
        self.assertEqual(len(second_results), 3)
        first_ids = sorted(r["id"] for r in self.results)
        second_ids = sorted(r["id"] for r in second_results)
        self.assertEqual(first_ids, second_ids,
            "Re-seeding produced different IDs — idempotency broken")
        for result in second_results:
            self.assertFalse(result["created"],
                f"Re-seeding created a new record for {result['key']}")

    def test_carrier_review_required_has_flag(self):
        """REVIEW_REQUIRED bid must have at least one FLAG patrol."""
        carrier = next(r for r in self.results if "CARRIER" in r["key"])
        record = self.repo.get_bid(carrier["id"])
        self.assertIsNotNone(record)
        self.assertEqual(record.scorecard.recommendation, "REVIEW_REQUIRED")
        flag_patrols = [p for p in record.scorecard.patrol_results if p.status == "FLAG"]
        self.assertGreater(len(flag_patrols), 0,
            "REVIEW_REQUIRED bid has no FLAG patrols")


class TestUploadFixture(unittest.TestCase):
    def test_upload_pdf_generated(self):
        """The live-upload fixture should be generated as a valid PDF."""
        path = generate_upload_fixture(verbose=False)
        self.assertTrue(os.path.exists(path))
        with open(path, "rb") as f:
            header = f.read(5)
        self.assertEqual(header, b"%PDF-", "Upload fixture is not a valid PDF")

    def test_upload_pdf_deterministic_extraction(self):
        """The upload fixture must produce deterministic extraction results."""
        from app.services.extractor import PDFExtractorService
        from app.services.patrols import ConstraintGraph, PatrolEngineService

        path = generate_upload_fixture(verbose=False)
        source = PDFExtractorService.extract_from_pdf_path(path)
        graph = ConstraintGraph()  # Use defaults
        scorecard = PatrolEngineService.run_all_patrols(source, graph=graph)

        self.assertIn("Acme", source.vendor_name)
        self.assertIsNotNone(source.bid_amount_inr)
        self.assertIn(scorecard.recommendation, ("RECOMMENDED", "REVIEW_REQUIRED"))


if __name__ == "__main__":
    unittest.main()
