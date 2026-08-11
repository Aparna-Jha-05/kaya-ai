"""Unit tests for CAD Drawing Intelligence Service."""

import unittest
import fitz
from app.services.cad_intelligence import CADDrawingIntelligenceService
from app.models.schemas import FactField


class TestCADDrawingIntelligence(unittest.TestCase):
    def test_vlm_configured_check(self):
        """Verify VLM config check returns boolean value without error."""
        vlm_ready = CADDrawingIntelligenceService.is_vlm_configured()
        self.assertIsInstance(vlm_ready, bool)

    def test_extract_cad_annotations_from_synthetic_drawing(self):
        """Synthetic PDF containing vector drawing text callouts must extract dimension annotations."""
        doc = fitz.open()
        page = doc.new_page(width=612, height=792)
        # Insert drawing vector line and text annotations
        page.draw_rect(fitz.Rect(100, 100, 400, 300))
        page.insert_text((110, 120), "CAD Drawing Spec: Width: 2100 mm", fontsize=10)
        page.insert_text((110, 140), "Clearance Length: 4.2 m", fontsize=10)
        pdf_bytes = doc.tobytes()
        doc.close()

        annotations, signals = CADDrawingIntelligenceService.extract_cad_annotations(pdf_bytes)

        self.assertTrue(len(annotations) >= 1)
        self.assertIn("VECTOR_CAD_DRAWINGS_DETECTED", signals)
        self.assertIn("CAD_DRAWING_ANNOTATIONS_PARSED", signals)

        width_annot = next((a for a in annotations if a.field == FactField.WIDTH_M), None)
        self.assertIsNotNone(width_annot)
        self.assertEqual(width_annot.normalized_value, 2.1)
        self.assertEqual(width_annot.unit, "m")

        length_annot = next((a for a in annotations if a.field == FactField.LENGTH_M), None)
        self.assertIsNotNone(length_annot)
        self.assertEqual(length_annot.normalized_value, 4.2)
        self.assertEqual(length_annot.unit, "m")


if __name__ == "__main__":
    unittest.main()
