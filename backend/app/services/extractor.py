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
    DimensionAnnotation,
    DocumentMetadata,
    EquipmentSpec,
    ExtractionProvider,
    ExtractionReport,
    ExtractionIssue,
    FactCandidate,
    FactField,
    VendorBidExtract,
)
from app.services.integrity import BidIntegrityService
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
        resolved_project = project_id or os.getenv("PO_LICE_PROJECT_ID", "PRJ-AMBER-01")
        try:
            document = fitz.open(pdf_path)
            try:
                pages = [(page.number + 1, page.get_text(), page) for page in document]
                text = "\n".join(page_text for _, page_text, _ in pages)
                if not text.strip():
                    raise ValueError("PDF has no extractable text")
                extracted = PDFExtractorService.parse_bid_text(
                    text,
                    submission_ip=submission_ip,
                    pdf_fingerprint=hashlib.sha256(raw_pdf).hexdigest(),
                    document_metadata=DocumentMetadata.model_validate(
                        BidIntegrityService.inspect_pdf_metadata(raw_pdf, Path(pdf_path).name)
                    ),
                )
                enriched = ExtractionCascade().enrich(text, extracted, resolved_project)
                located_report = PDFExtractorService._locate_candidates(
                    enriched.extraction_report,
                    pages,
                )
                return enriched.model_copy(update={"extraction_report": located_report})
            finally:
                document.close()
        except fitz.FileDataError as error:
            raise ValueError("Invalid or corrupted PDF") from error

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
            page_width: float | None = None
            page_height: float | None = None
            page_rotation: int | None = None
            coordinate_system: str | None = None
            for number, page_text, page in page_list:
                if " ".join(candidate.source_excerpt.casefold().split()) not in " ".join(page_text.casefold().split()):
                    continue
                page_number = number
                page_width = float(page.rect.width)
                page_height = float(page.rect.height)
                page_rotation = int(page.rotation)
                coordinate_system = "PYMUPDF_PAGE_SPACE_TOP_LEFT_POINTS"
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
                        "page_width": page_width,
                        "page_height": page_height,
                        "page_rotation": page_rotation,
                        "coordinate_system": coordinate_system,
                        "validation_signals": [
                            *candidate.validation_signals,
                            *(["PAGE_LOCATED"] if page_number else []),
                            *(["BBOX_LOCATED"] if bbox else []),
                        ],
                    }
                )
            )
        selected = {candidate.field.value: candidate for candidate in located if candidate.accepted}
        width = selected.get(FactField.WIDTH_M.value)
        annotations: list[DimensionAnnotation] = []
        issues = list(report.issues)
        for candidate in selected.values():
            if not candidate.bbox:
                issues.append(
                    ExtractionIssue(
                        code="EVIDENCE_REGION_UNAVAILABLE",
                        message="The supporting excerpt was retained but could not be mapped to a PDF rectangle.",
                        field=candidate.field,
                        provider=candidate.provider,
                    )
                )
        if (
            width
            and width.bbox
            and width.page
            and width.page_width
            and width.page_height
            and width.page_rotation is not None
            and width.coordinate_system
        ):
            annotations.append(
                DimensionAnnotation(
                    field=FactField.WIDTH_M,
                    normalized_value=float(width.normalized_value),
                    unit=width.unit or "m",
                    source_excerpt=width.source_excerpt,
                    page=width.page,
                    bbox=width.bbox,
                    page_width=width.page_width,
                    page_height=width.page_height,
                    page_rotation=width.page_rotation,
                    coordinate_system=width.coordinate_system,
                )
            )
        else:
            issues.append(
                ExtractionIssue(
                    code="DIMENSION_ANNOTATION_UNAVAILABLE",
                    message="No reliably located textual width annotation was detected; drawing geometry requires review.",
                    field=FactField.WIDTH_M,
                    provider=width.provider if width else None,
                )
            )
        return report.model_copy(
            update={
                "candidates": located,
                "selected": selected,
                "dimension_annotations": annotations,
                "issues": issues,
            }
        )

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
