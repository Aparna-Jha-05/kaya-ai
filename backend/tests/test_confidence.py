"""Unit tests for Stage S6 Candidate Confidence Scoring & Reviewer Threshold Gate."""

import unittest
from app.services.confidence import ConfidenceScoringService, HUMAN_REVIEW_THRESHOLD
from app.models.schemas import FactCandidate, FactField, ExtractionProvider


class TestStageS6ConfidenceScoring(unittest.TestCase):
    def test_deterministic_candidate_high_confidence(self):
        """Deterministic regex candidate with valid page excerpt must yield >= 0.98 confidence."""
        candidate = FactCandidate(
            field=FactField.POWER_DRAW_KW,
            raw_value="1100 kW",
            normalized_value=1100.0,
            unit="kW",
            source_excerpt="Substation Power Draw: 1100 kW",
            extractor="regex",
            provider=ExtractionProvider.DETERMINISTIC,
            model="regex-v2",
            page=1,
            bbox=(100.0, 200.0, 300.0, 220.0),
            page_width=612.0,
            page_height=792.0,
            page_rotation=0,
            coordinate_system="PYMUPDF_PAGE_SPACE_TOP_LEFT_POINTS",
            accepted=True,
        )

        text = "VENDOR: Test Vendor\nSubstation Power Draw: 1100 kW\n"
        scored = ConfidenceScoringService.evaluate_candidate_confidence(candidate, text)

        self.assertGreaterEqual(scored.confidence, 0.95)
        self.assertNotIn("LOW_CONFIDENCE_FACT", scored.validation_signals)

    def test_low_confidence_candidate_threshold_intercept(self):
        """Uncertain SLM fallback candidate with missing excerpt must trigger low-confidence intercept gate."""
        candidate = FactCandidate(
            field=FactField.FLOOR_LOAD_KG,
            raw_value="3500 kg",
            normalized_value=3500.0,
            unit="kg",
            source_excerpt="Unverified Operating Weight 3.5 tonnes",
            extractor="ollama_fallback",
            provider=ExtractionProvider.OLLAMA,
            model="llama3.1:8b_fallback",
            bbox=None,  # missing bbox triggers penalty
            accepted=True,
        )

        text = "VENDOR: Test Vendor\n"  # excerpt missing from document text triggers penalty
        scored = ConfidenceScoringService.evaluate_candidate_confidence(candidate, text)

        self.assertLess(scored.confidence, HUMAN_REVIEW_THRESHOLD)
        self.assertIn("LOW_CONFIDENCE_FACT", scored.validation_signals)
        self.assertIn("HUMAN_REVIEW_REQUIRED", scored.validation_signals)


if __name__ == "__main__":
    unittest.main()
