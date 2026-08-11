"""Unit tests for Stage S4 Legal Clause Segmentation Service."""

import unittest
from app.services.clause_parser import ClauseSegmentationService


class TestStageS4ClauseParser(unittest.TestCase):
    def test_spacy_availability_check(self):
        """Verify spaCy availability check returns boolean without throwing exceptions."""
        spacy_ready = ClauseSegmentationService.is_spacy_available()
        self.assertIsInstance(spacy_ready, bool)

    def test_segment_legal_clauses(self):
        """Synthetic contract text must segment warranty and liability clauses."""
        contract_text = (
            "COMMERCIAL SPECIFICATION SHEET\n"
            "Warranty: 5 years full coverage on compressor and heat exchanger.\n"
            "Limitation of Liability: Total liability capped at contract value.\n"
            "Indemnification: Vendor agrees to indemnify buyer against patent infringement.\n"
            "Payment Terms: 30 days net upon milestone completion.\n"
        )

        clauses = ClauseSegmentationService.segment_clauses(contract_text)
        analysis = ClauseSegmentationService.analyze_clause_risks(clauses)

        self.assertTrue(len(clauses) >= 3)
        self.assertTrue(analysis["has_warranty_clause"])
        self.assertTrue(analysis["has_liability_cap"])
        self.assertEqual(analysis["warranty_years_found"], 5)


if __name__ == "__main__":
    unittest.main()
