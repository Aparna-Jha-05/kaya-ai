"""Conservative PDF extraction. Missing evidence stays missing; it is never invented."""

from __future__ import annotations

import hashlib
import os
import re
from pathlib import Path
from typing import Iterable

import fitz

from app.models.schemas import (
    CANONICAL_FACT_UNITS,
    DocumentMetadata,
    EquipmentSpec,
    ExtractionProvider,
    ExtractionReport,
    FactCandidate,
    FactField,
    VendorBidExtract,
)
from app.services.model_extraction import ExtractionCascade, normalize_fact_value


class PDFExtractorService:
    _patterns: tuple[tuple[FactField, str], ...] = (
        (FactField.VENDOR_NAME, r"(?:VENDOR|Vendor\s*Name)\s*:\s*(?P<value>[^\n]+)"),
        (FactField.MODEL_NUMBER, r"(?:Equipment\s*Model|Model\s*Number)\s*:\s*(?P<value>[^\n]+)"),
        (
            FactField.BID_AMOUNT_INR,
            r"(?:Upfront\s*Capex\s*Price|Upfront\s*Bid\s*Amount)\s*:\s*(?P<unit>INR)\s*(?P<value>[\d,]+)",
        ),
        (
            FactField.DELIVERY_WEEKS,
            r"Promised\s*Delivery(?:\s*SLA)?\s*:\s*(?P<value>[\d,.]+)\s*(?P<unit>Weeks?|Days?)",
        ),
        (
            FactField.OSHA_CERT,
            r"OSHA[^\n]*(?P<value>PENDING|MISSING|NOT\s*ATTACHED|CERTIFIED|ATTACHED|VALID|YES|NO)",
        ),
        (
            FactField.POWER_DRAW_KW,
            r"(?:Substation\s*Power\s*Draw|Power\s*Consumption)\s*:\s*(?P<value>[\d,.]+)\s*(?P<unit>kW|MW)",
        ),
        (
            FactField.COOLING_CAPACITY_KW,
            r"Cooling\s*Capacity\s*:\s*(?P<value>[\d,.]+)\s*(?P<unit>kW|MW)",
        ),
        (
            FactField.WIDTH_M,
            r"(?:Equipment\s*)?Width\s*:\s*(?P<value>[\d,.]+)\s*(?P<unit>mm|m)",
        ),
        (
            FactField.EMBODIED_CARBON,
            r"Embodied\s*Carbon(?:\s*Factor)?\s*:\s*(?P<value>[\d,.]+)\s*(?P<unit>kgCO2e(?:/ton)?|tCO2e(?:/ton)?)",
        ),
    )

    @staticmethod
    def extract_from_pdf_path(
        pdf_path: str,
        submission_ip: str | None = None,
        project_id: str | None = None,
    ) -> VendorBidExtract:
        raw_pdf = Path(pdf_path).read_bytes()
        try:
            document = fitz.open(pdf_path)
            try:
                pages = [(page.number + 1, page.get_text(), page) for page in document]
                text = "\n".join(page_text for _, page_text, _ in pages)
                metadata = document.metadata or {}
                extracted = PDFExtractorService.parse_bid_text(
                    text,
                    submission_ip=submission_ip,
                    pdf_fingerprint=hashlib.sha256(raw_pdf).hexdigest(),
                    document_metadata=DocumentMetadata(
                        author=metadata.get("author") or None,
                        creation_date=metadata.get("creationDate") or None,
                        creator_tool=metadata.get("creator") or metadata.get("producer") or None,
                    ),
                )
                located_report = PDFExtractorService._locate_candidates(extracted.extraction_report, pages)
                extracted = extracted.model_copy(update={"extraction_report": located_report})
            finally:
                document.close()
        except fitz.FileDataError as error:
            raise ValueError("Invalid or corrupted PDF") from error
        if not text.strip():
            raise ValueError("PDF has no extractable text")
        resolved_project = project_id or os.getenv("PO_LICE_PROJECT_ID", "demo")
        return ExtractionCascade().enrich(text, extracted, resolved_project)

    @staticmethod
    def _clauses(text: str) -> list[str]:
        terms = ("warranty", "limitation of liability", "indemnity", "termination", "payment terms")
        return [
            line.strip(" -\t")[:500]
            for line in text.splitlines()
            if line.strip() and any(term in line.lower() for term in terms)
        ][:50]

    @classmethod
    def _deterministic_candidates(cls, text: str) -> list[FactCandidate]:
        candidates: list[FactCandidate] = []
        for field, pattern in cls._patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if not match:
                continue
            raw_value = match.group("value").strip()
            source_value = " ".join(part for part in (raw_value, match.groupdict().get("unit")) if part)
            try:
                normalized = normalize_fact_value(field, source_value)
            except ValueError:
                continue
            candidates.append(
                FactCandidate(
                    field=field,
                    raw_value=source_value,
                    normalized_value=normalized,
                    unit=CANONICAL_FACT_UNITS[field],
                    source_excerpt=match.group(0).strip(),
                    extractor="regex",
                    provider=ExtractionProvider.DETERMINISTIC,
                    model="regex-v2",
                    validation_signals=["REGEX_MATCH", "SERVER_NORMALIZED"],
                    accepted=True,
                )
            )
        return candidates

    @staticmethod
    def _locate_candidates(
        report: ExtractionReport,
        pages: Iterable[tuple[int, str, fitz.Page]],
    ) -> ExtractionReport:
        located: list[FactCandidate] = []
        page_list = list(pages)
        for candidate in report.candidates:
            page_number: int | None = None
            bbox: tuple[float, float, float, float] | None = None
            for number, page_text, page in page_list:
                if " ".join(candidate.source_excerpt.casefold().split()) not in " ".join(page_text.casefold().split()):
                    continue
                page_number = number
                rectangles = page.search_for(candidate.source_excerpt)
                if rectangles:
                    rectangle = rectangles[0]
                    bbox = (rectangle.x0, rectangle.y0, rectangle.x1, rectangle.y1)
                break
            located.append(
                FactCandidate.model_validate(
                    {
                        **candidate.model_dump(),
                        "page": page_number,
                        "bbox": bbox,
                        "validation_signals": [
                            *candidate.validation_signals,
                            *(["PAGE_LOCATED"] if page_number else []),
                            *(["BBOX_LOCATED"] if bbox else []),
                        ],
                    }
                )
            )
        selected = {candidate.field.value: candidate for candidate in located if candidate.accepted}
        return report.model_copy(update={"candidates": located, "selected": selected})

    @classmethod
    def parse_bid_text(
        cls,
        text: str,
        submission_ip: str | None = None,
        pdf_fingerprint: str | None = None,
        document_metadata: DocumentMetadata | None = None,
    ) -> VendorBidExtract:
        candidates = cls._deterministic_candidates(text)
        report = ExtractionReport(
            candidates=candidates,
            selected={candidate.field.value: candidate for candidate in candidates},
            providers_attempted=[ExtractionProvider.DETERMINISTIC],
        )

        def value(field: FactField, default: object = None) -> object:
            candidate = report.selected.get(field.value)
            return candidate.normalized_value if candidate else default

        vendor_name = str(value(FactField.VENDOR_NAME, "Unidentified vendor"))
        vendor_id = f"VENDOR-{hashlib.sha256(vendor_name.casefold().encode()).hexdigest()[:12].upper()}"
        model_number = str(value(FactField.MODEL_NUMBER, "Not stated"))[:120]

        return VendorBidExtract(
            vendor_id=vendor_id,
            vendor_name=vendor_name,
            bid_amount_inr=value(FactField.BID_AMOUNT_INR),
            promised_delivery_weeks=value(FactField.DELIVERY_WEEKS),
            has_osha_cert=value(FactField.OSHA_CERT),
            equipment=EquipmentSpec(
                equipment_type="Chiller",
                manufacturer=vendor_name,
                model_number=model_number,
                power_draw_kw=value(FactField.POWER_DRAW_KW),
                cooling_capacity_kw=value(FactField.COOLING_CAPACITY_KW),
                width_m=value(FactField.WIDTH_M),
                embodied_carbon_factor=value(FactField.EMBODIED_CARBON),
            ),
            submission_ip=submission_ip,
            pdf_fingerprint=pdf_fingerprint,
            extracted_clauses=cls._clauses(text),
            document_metadata=document_metadata or DocumentMetadata(),
            extraction_report=report,
        )
