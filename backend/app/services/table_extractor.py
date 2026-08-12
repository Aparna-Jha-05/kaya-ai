"""Stage S3: Multi-Column Table Extraction & Normalization Service."""

from __future__ import annotations

import io
import logging
import os
import re
import shutil
from pathlib import Path
from typing import Any, Dict, List, Tuple

import pymupdf as fitz

from app.models.schemas import CANONICAL_FACT_UNITS, FactCandidate, FactField, ExtractionProvider
from app.services.model_extraction import normalize_fact_value

logger = logging.getLogger(__name__)


class TableExtractionService:
    """Stage S3 Table Extraction Service with multi-engine fallback (Camelot -> pdfplumber -> PyMuPDF Matrix)."""

    @staticmethod
    def is_ghostscript_installed() -> bool:
        """Check if Ghostscript binary ('gs') is present for Camelot."""
        return shutil.which("gs") is not None or shutil.which("gswin64c") is not None

    @staticmethod
    def is_pdfplumber_available() -> bool:
        """Check if pdfplumber is importable."""
        try:
            import pdfplumber  # type: ignore # noqa: F401

            return True
        except ImportError:
            return False

    @staticmethod
    def is_camelot_available() -> bool:
        """Check if camelot library is importable."""
        try:
            import camelot  # type: ignore # noqa: F401

            return True
        except ImportError:
            return False

    @classmethod
    def extract_tables_from_pdf_bytes(cls, raw_pdf: bytes) -> Tuple[List[Dict[str, Any]], List[FactCandidate]]:
        """Extract tabular structures and key-value facts from PDF pages."""
        extracted_tables: List[Dict[str, Any]] = []
        fact_candidates: List[FactCandidate] = []
        ghostscript_ready = cls.is_ghostscript_installed()
        camelot_ready = cls.is_camelot_available()
        pdfplumber_ready = cls.is_pdfplumber_available()

        # Temporary file wrapper if Camelot needs a disk path
        try:
            doc = fitz.open(stream=raw_pdf, filetype="pdf")
            try:
                for page_idx in range(len(doc)):
                    page_num = page_idx + 1
                    page = doc[page_idx]
                    table_rows: List[List[str]] = []
                    engine_used = "NONE"

                    # Level 1: pdfplumber Native Python Tabular Parser (Guaranteed No-Binary Dependency)
                    if pdfplumber_ready and not table_rows:
                        try:
                            import pdfplumber

                            with pdfplumber.open(io.BytesIO(raw_pdf)) as pdf:
                                if page_idx < len(pdf.pages):
                                    plumber_page = pdf.pages[page_idx]
                                    raw_tables = plumber_page.extract_tables()
                                    if raw_tables:
                                        for t in raw_tables:
                                            clean_t = [[str(cell or "").strip() for cell in row] for row in t if any(row)]
                                            table_rows.extend(clean_t)
                                        engine_used = "PDFPLUMBER_TABULAR"
                        except Exception as err:
                            logger.warning("pdfplumber table extraction page %d failed: %s", page_num, err)

                    # Level 2: Camelot-py Lattice/Stream Engine (if Ghostscript and Camelot installed)
                    if ghostscript_ready and camelot_ready and not table_rows:
                        try:
                            import camelot  # type: ignore
                            import tempfile

                            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                                tmp.write(raw_pdf)
                                tmp_path = tmp.name

                            try:
                                tables = camelot.read_pdf(tmp_path, pages=str(page_num), flavor="lattice")
                                if len(tables) == 0 or tables[0].parsing_report.get("accuracy", 0) < 50:
                                    tables = camelot.read_pdf(tmp_path, pages=str(page_num), flavor="stream")
                                if len(tables) > 0:
                                    df = tables[0].df
                                    table_rows = df.values.tolist()
                                    engine_used = f"CAMELOT_{tables[0].flavor.upper()}"
                            finally:
                                Path(tmp_path).unlink(missing_ok=True)
                        except Exception as err:
                            logger.warning("Camelot table extraction page %d failed: %s", page_num, err)

                    # Level 3: PyMuPDF Block Matrix Fallback
                    if not table_rows:
                        blocks = page.get_text("blocks")
                        for b in blocks:
                            if len(b) >= 5 and isinstance(b[4], str) and ("\t" in b[4] or "  " in b[4]):
                                lines = b[4].splitlines()
                                for line in lines:
                                    parts = [p.strip() for p in re.split(r"\t+|\s{2,}", line) if p.strip()]
                                    if len(parts) >= 2:
                                        table_rows.append(parts)
                        if table_rows:
                            engine_used = "PYMUPDF_MATRIX_FALLBACK"

                    if table_rows:
                        extracted_tables.append(
                            {
                                "page": page_num,
                                "engine": engine_used,
                                "rows": table_rows,
                            }
                        )

                        # Convert table rows to FactCandidate objects
                        candidates = cls._parse_candidates_from_table_rows(table_rows, page_num, engine_used)
                        fact_candidates.extend(candidates)

            finally:
                doc.close()
        except Exception as err:
            logger.error("Stage S3 Table extraction failed: %s", err)

        return extracted_tables, fact_candidates

    @classmethod
    def _parse_candidates_from_table_rows(
        cls, rows: List[List[str]], page_num: int, engine_name: str
    ) -> List[FactCandidate]:
        candidates: List[FactCandidate] = []
        field_keywords = {
            FactField.VENDOR_NAME: ["vendor", "supplier", "bidder", "manufacturer"],
            FactField.MODEL_NUMBER: ["model", "equipment model", "part number", "model no"],
            FactField.BID_AMOUNT_INR: ["upfront", "capex", "price", "bid amount", "cost"],
            FactField.DELIVERY_WEEKS: ["delivery", "lead time", "promised delivery", "sla"],
            FactField.OSHA_CERT: ["osha", "safety cert", "form 300", "safety certified"],
            FactField.POWER_DRAW_KW: ["power", "substation", "draw", "power draw", "consumption"],
            FactField.COOLING_CAPACITY_KW: ["cooling", "capacity", "cooling capacity", "tons"],
            FactField.WIDTH_M: ["width", "equipment width", "clearance width"],
            FactField.EMBODIED_CARBON: ["carbon", "embodied carbon", "kgco2e", "emissions"],
            FactField.WATER_EVAP_GPM: ["water", "evaporation", "evap rate", "water evap"],
            FactField.FLOOR_LOAD_KG: ["floor load", "weight", "operating weight", "kg/m2"],
        }

        for row in rows:
            if len(row) < 2:
                continue
            row_str = " ".join(row).strip()
            for field, keywords in field_keywords.items():
                if any(kw in row_str.lower() for kw in keywords):
                    # Value candidate is usually in the last or second column
                    for col in reversed(row):
                        col_clean = col.strip()
                        if not col_clean or any(kw in col_clean.lower() for kw in keywords):
                            continue
                        try:
                            normalized = normalize_fact_value(field, col_clean)
                            candidates.append(
                                FactCandidate(
                                    field=field,
                                    raw_value=col_clean,
                                    normalized_value=normalized,
                                    unit=CANONICAL_FACT_UNITS[field],
                                    source_excerpt=f"Table ({engine_name}): {row_str[:120]}",
                                    extractor="table_parser",
                                    provider=ExtractionProvider.DETERMINISTIC,
                                    model=engine_name,
                                    page=page_num,
                                    validation_signals=["TABLE_GRID_EXTRACTED", "SERVER_NORMALIZED"],
                                    accepted=True,
                                )
                            )
                            break
                        except ValueError:
                            continue

        return candidates
