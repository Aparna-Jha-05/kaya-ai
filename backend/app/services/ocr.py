"""Stage S2: Scanned Document OCR Fallback Engine."""

from __future__ import annotations

import logging
import os
import shutil
from typing import Tuple

import fitz

logger = logging.getLogger(__name__)


class OCREngineService:
    """Stage S2 OCR Fallback Engine providing multi-engine OCR strategy."""

    @staticmethod
    def is_tesseract_available() -> bool:
        """Check if tesseract binary or pytesseract library is available."""
        return shutil.which("tesseract") is not None

    @staticmethod
    def is_easyocr_available() -> bool:
        """Check if EasyOCR library is importable."""
        try:
            import easyocr  # type: ignore # noqa: F401

            return True
        except ImportError:
            return False

    @classmethod
    def run_ocr_on_pdf_bytes(cls, raw_pdf: bytes, dpi: int = 300) -> Tuple[str, list[dict]]:
        """Run Stage S2 OCR on PDF page images rendered at 300 DPI via PyMuPDF pixmaps."""
        ocr_lines: list[str] = []
        page_details: list[dict] = []
        tesseract_ready = cls.is_tesseract_available()
        easyocr_ready = cls.is_easyocr_available()

        try:
            doc = fitz.open(stream=raw_pdf, filetype="pdf")
            try:
                for page_idx in range(len(doc)):
                    page = doc[page_idx]
                    page_num = page_idx + 1

                    # Render high-resolution 300 DPI pixmap directly in memory via PyMuPDF
                    pix = page.get_pixmap(dpi=dpi)
                    img_bytes = pix.tobytes("png")

                    page_text = ""
                    ocr_engine_used = "NONE"

                    # Level 1: Tesseract OCR Engine
                    if tesseract_ready:
                        try:
                            import pytesseract  # type: ignore
                            from PIL import Image  # type: ignore
                            import io

                            image = Image.open(io.BytesIO(img_bytes))
                            page_text = pytesseract.image_to_string(image)
                            ocr_engine_used = "TESSERACT_300DPI"
                        except Exception as err:
                            logger.warning("Tesseract OCR page %d failed: %s", page_num, err)

                    # Level 2: EasyOCR Engine Fallback
                    if not page_text.strip() and easyocr_ready:
                        try:
                            import easyocr  # type: ignore
                            import numpy as np  # type: ignore
                            from PIL import Image  # type: ignore
                            import io

                            image = Image.open(io.BytesIO(img_bytes))
                            reader = easyocr.Reader(["en"], gpu=False)
                            results = reader.readtext(np.array(image))
                            page_text = "\n".join([res[1] for res in results])
                            ocr_engine_used = "EASYOCR_FALLBACK"
                        except Exception as err:
                            logger.warning("EasyOCR page %d failed: %s", page_num, err)

                    # Level 3: Native PyMuPDF Drawing & Block Fallback if OCR engines uninstalled
                    if not page_text.strip():
                        # Extract drawing text annotations / text blocks as fallback
                        blocks = page.get_text("blocks")
                        page_text = "\n".join([b[4] for b in blocks if isinstance(b[4], str)])
                        ocr_engine_used = "PYMUPDF_BLOCK_FALLBACK"

                    ocr_lines.append(f"--- PAGE {page_num} OCR ({ocr_engine_used}) ---\n" + page_text)
                    page_details.append(
                        {
                            "page": page_num,
                            "text": page_text,
                            "engine": ocr_engine_used,
                            "width": page.rect.width,
                            "height": page.rect.height,
                        }
                    )
            finally:
                doc.close()
        except Exception as err:
            logger.error("Stage S2 OCR process failed: %s", err)
            return "", []

        full_ocr_text = "\n".join(ocr_lines)
        return full_ocr_text, page_details
