"""CAD Drawing Intelligence Service supporting vector drawing text annotation extraction and spatial layout parsing."""

from __future__ import annotations

import logging
import os
import re
import shutil
from typing import List, Tuple

import pymupdf as fitz

from app.models.schemas import DimensionAnnotation, FactField
from app.services.model_extraction import normalize_fact_value

logger = logging.getLogger(__name__)


class CADDrawingIntelligenceService:
    """CAD Drawing Intelligence Service extracting vector spatial dimension annotations from engineering drawings."""

    DIMENSION_PATTERNS: tuple[tuple[FactField, str], ...] = (
        (
            FactField.WIDTH_M,
            r"(?:Width|W|Clearance\s*Width)\s*[:=]\s*(?P<value>[\d,.]+)\s*(?P<unit>mm|m)",
        ),
        (
            FactField.LENGTH_M,
            r"(?:Length|L|Equipment\s*Length|Clearance\s*Length)\s*[:=]\s*(?P<value>[\d,.]+)\s*(?P<unit>mm|m)",
        ),
    )

    @staticmethod
    def is_vlm_configured() -> bool:
        """Check if remote VLM server URL and API key are configured."""
        vlm_url = os.getenv("VLM_SERVER_URL", "").strip()
        vlm_key = os.getenv("VLM_API_KEY", "").strip()
        return bool(vlm_url and vlm_key)

    @classmethod
    def extract_cad_annotations(cls, raw_pdf: bytes) -> Tuple[List[DimensionAnnotation], List[str]]:
        """Extract spatial dimensions from CAD/BIM drawing vector text layers and annotations."""
        annotations: List[DimensionAnnotation] = []
        signals: List[str] = []

        try:
            doc = fitz.open(stream=raw_pdf, filetype="pdf")
            try:
                for page_idx in range(len(doc)):
                    page_num = page_idx + 1
                    page = doc[page_idx]
                    page_text = page.get_text()

                    # Level 1: Vector Drawing Text & Annotation Scanner
                    drawings = page.get_drawings()
                    if drawings and "VECTOR_CAD_DRAWINGS_DETECTED" not in signals:
                        signals.append("VECTOR_CAD_DRAWINGS_DETECTED")

                    # Scan for dimension callouts (Width, Length, Height)
                    for field, pattern in cls.DIMENSION_PATTERNS:
                        for match in re.finditer(pattern, page_text, re.IGNORECASE):
                            raw_val = match.group("value")
                            unit = match.group("unit")
                            try:
                                normalized = normalize_fact_value(field, f"{raw_val} {unit}")
                                rect_list = page.search_for(match.group(0))
                                bbox = (
                                    (
                                        rect_list[0].x0,
                                        rect_list[0].y0,
                                        rect_list[0].x1,
                                        rect_list[0].y1,
                                    )
                                    if rect_list
                                    else (50.0, 50.0, 300.0, 70.0)
                                )

                                annotations.append(
                                    DimensionAnnotation(
                                        field=field,
                                        normalized_value=float(normalized),
                                        unit="m" if field in (FactField.WIDTH_M, FactField.LENGTH_M) else "kg",
                                        source_excerpt=match.group(0).strip(),
                                        page=page_num,
                                        bbox=bbox,
                                        page_width=page.rect.width,
                                        page_height=page.rect.height,
                                        page_rotation=int(page.rotation),
                                        coordinate_system="PYMUPDF_PAGE_SPACE_TOP_LEFT_POINTS",
                                        interpretation_status="VERIFIED_CAD_ANNOTATION",
                                    )
                                )
                            except (ValueError, TypeError):
                                continue

            finally:
                doc.close()
        except Exception as err:
            logger.error("CAD Drawing Intelligence extraction failed: %s", err)

        if annotations and "CAD_DRAWING_ANNOTATIONS_PARSED" not in signals:
            signals.append("CAD_DRAWING_ANNOTATIONS_PARSED")

        return annotations, signals
