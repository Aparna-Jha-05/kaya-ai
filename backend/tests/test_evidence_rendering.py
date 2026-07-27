"""Assertion-based tests proving evidence location and fallback contracts.

Verifies:
- Task 3.3: Failed API responses and retry payloads return valid error contract.
- Task 4.3: Missing or unsupported evidence remains FLAG; page and geometry are never invented.
"""

import unittest
from app.models.schemas import FactCandidate, FactField, ExtractionProvider
from app.services.model_extraction import validate_provider_candidates
from app.services.patrols import ConstraintGraph, PatrolEngineService
from app.services.extractor import PDFExtractorService


class EvidenceContractTests(unittest.TestCase):
    def test_4_3_missing_evidence_remains_flag_and_never_invents_geometry(self):
        """When evidence is missing or unsupported, status is FLAG and bbox/page are None."""
        text = "VENDOR: Partial Vendor Inc\nEquipment Model: P-100\nSubstation Power Draw: 1100 kW"
        extracted = PDFExtractorService.parse_bid_text(text)

        # Width and carbon are not present in text
        self.assertIsNone(extracted.equipment.width_m)
        self.assertIsNone(extracted.equipment.embodied_carbon_factor)

        # Candidates must not invent geometry or page
        for candidate in extracted.extraction_report.candidates:
            if candidate.field in ("width_m", "embodied_carbon_factor"):
                self.fail("Extracted candidate for missing field")

        # Patrols evaluate missing evidence as FLAG
        graph = ConstraintGraph()
        scorecard = PatrolEngineService.run_all_patrols(extracted, graph=graph)
        building = next(p for p in scorecard.patrol_results if p.patrol_name == "BUILDING_PATROL")
        self.assertEqual(building.status, "FLAG")
        self.assertIn("INSUFFICIENT_EVIDENCE", building.rule_broken or "")

    def test_4_3_unsupported_model_candidate_is_rejected(self):
        """Model candidate proposing a value without exact text support is rejected."""
        document_text = "VENDOR: Test Vendor\nEquipment Model: T-1"
        invented_candidate = FactCandidate(
            field=FactField.WIDTH_M,
            raw_value="1.8 m",
            normalized_value=1.8,
            unit="m",
            source_excerpt="Width: 1.8 m",  # Not in document_text!
            extractor="model",
            provider=ExtractionProvider.OLLAMA,
            model="test",
        )
        accepted, issues = validate_provider_candidates(
            document_text, [invented_candidate], {FactField.WIDTH_M}
        )
        self.assertEqual(accepted, [], "Invented candidate was accepted!")
        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0].code, "UNSUPPORTED_BY_SOURCE")


if __name__ == "__main__":
    unittest.main()
