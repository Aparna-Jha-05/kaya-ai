"""Unit tests for Stage S2 OCR Fallback Engine."""

import unittest
import pymupdf as fitz
from app.services.ocr import OCREngineService
from app.services.extractor import PDFExtractorService


class TestStageS2OCREngine(unittest.TestCase):
    def test_ocr_availability_check(self):
        """Verify binary/library availability checks return boolean values without throwing exceptions."""
        tesseract_ready = OCREngineService.is_tesseract_available()
        easyocr_ready = OCREngineService.is_easyocr_available()
        self.assertIsInstance(tesseract_ready, bool)
        self.assertIsInstance(easyocr_ready, bool)

    def test_synthetic_scanned_pdf_ocr_trigger(self):
        """A PDF with minimal text layer must trigger Stage S2 OCR and produce review signals."""
        # Create a synthetic single-page PDF with minimal text
        doc = fitz.open()
        page = doc.new_page(width=612, height=792)
        page.insert_text((50, 50), "Scanned Doc Placeholder", fontsize=8)
        pdf_bytes = doc.tobytes()
        doc.close()

        extracted = PDFExtractorService.extract_from_pdf_bytes(
            raw_pdf=pdf_bytes,
            filename="synthetic_scanned.pdf",
            project_id="PRJ-AMBER-01",
        )

        signals = extracted.document_metadata.review_signals
        warnings = extracted.document_metadata.parser_warnings

        self.assertIn("SCANNED_PDF_IMAGE_DETECTED", signals)
        self.assertIn("OCR_FALLBACK_RECOMMENDED", warnings)


if __name__ == "__main__":
    unittest.main()
