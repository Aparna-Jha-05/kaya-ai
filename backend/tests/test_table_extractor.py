"""Unit tests for Stage S3 Multi-Column Table Extraction Service."""

import unittest
import fitz
from app.services.table_extractor import TableExtractionService
from app.models.schemas import FactField


class TestStageS3TableExtractor(unittest.TestCase):
    def test_ghostscript_and_pdfplumber_availability_checks(self):
        """Verify engine availability checks return boolean values without throwing exceptions."""
        gs_ready = TableExtractionService.is_ghostscript_installed()
        plumber_ready = TableExtractionService.is_pdfplumber_available()
        self.assertIsInstance(gs_ready, bool)
        self.assertIsInstance(plumber_ready, bool)

    def test_parse_candidates_from_synthetic_table_rows(self):
        """Synthetic table rows must parse and normalize into FactCandidate objects."""
        table_rows = [
            ["Equipment Model", "TR-1100"],
            ["Substation Power Draw", "1100 kW"],
            ["Cooling Capacity", "900 kW"],
            ["Equipment Width", "1.8 m"],
            ["Embodied Carbon", "380 kgCO2e/ton"],
            ["Water Evaporation Rate", "18 gpm"],
            ["Floor Load", "2200 kg"],
        ]

        candidates = TableExtractionService._parse_candidates_from_table_rows(
            table_rows, page_num=1, engine_name="TEST_GRID"
        )

        extracted_fields = {c.field for c in candidates}

        self.assertIn(FactField.MODEL_NUMBER, extracted_fields)
        self.assertIn(FactField.POWER_DRAW_KW, extracted_fields)
        self.assertIn(FactField.COOLING_CAPACITY_KW, extracted_fields)
        self.assertIn(FactField.WIDTH_M, extracted_fields)
        self.assertIn(FactField.EMBODIED_CARBON, extracted_fields)
        self.assertIn(FactField.WATER_EVAP_GPM, extracted_fields)
        self.assertIn(FactField.FLOOR_LOAD_KG, extracted_fields)


if __name__ == "__main__":
    unittest.main()
