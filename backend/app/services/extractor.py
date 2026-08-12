"""Conservative PDF extraction. Missing evidence stays missing; it is never invented."""

from __future__ import annotations

import hashlib
import os
import re
from pathlib import Path
from typing import Iterable

import pymupdf as fitz

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
from app.services.cad_intelligence import CADDrawingIntelligenceService
from app.services.clause_parser import ClauseSegmentationService
from app.services.confidence import ConfidenceScoringService
from app.services.integrity import BidIntegrityService
from app.services.model_extraction import ExtractionCascade, normalize_fact_value
from app.services.ocr import OCREngineService
from app.services.table_extractor import TableExtractionService


class PDFExtractorService:
    _patterns: tuple[tuple[FactField, str], ...] = (
        (
            FactField.VENDOR_NAME,
            r"(?:VENDOR|Vendor\s*Name|Supplier\s*Name|Bidder\s*Name|Manufacturer|Company|Contractor)\s*[:\-]\s*(?P<value>[^\n]+)",
        ),
        (
            FactField.MODEL_NUMBER,
            r"(?:Equipment\s*Model|Model\s*Number|Model\s*No\.?|Part\s*No\.?|Series|Product\s*Code)\s*[:\-]\s*(?P<value>[^\n]+)",
        ),
        (
            FactField.BID_AMOUNT_INR,
            r"(?:Upfront\s*Capex\s*Price|Upfront\s*Bid\s*Amount|Total\s*Price|Total\s*Capex|Bid\s*Amount|Quoted\s*Amount|Capex\s*Cost|Price)\s*[:\-]?\s*(?P<unit>INR|Rs\.?|₹)?\s*(?P<value>[\d,]+(?:\.\d+)?|\d+\s*(?:lakhs?|crores?))",
        ),
        (
            FactField.DELIVERY_WEEKS,
            r"(?:Promised\s*Delivery(?:\s*SLA)?|Lead\s*Time|Delivery\s*Time|Completion\s*Window|Schedule)\s*[:\-]?\s*(?P<value>[\d,.]+)\s*(?P<unit>Weeks?|Days?|Months?)",
        ),
        (
            FactField.OSHA_CERT,
            r"OSHA[^\n]*[:\-]?\s*(?P<value>PENDING|MISSING|NOT\s*ATTACHED|CERTIFIED|ATTACHED|VALID|YES|NO|COMPLIANT|NON-COMPLIANT)",
        ),
        (
            FactField.POWER_DRAW_KW,
            r"(?:Substation\s*Power\s*Draw|Power\s*Consumption|Power\s*Draw|Electrical\s*Demand|Power\s*Rating|Substation\s*Load)\s*[:\-]?\s*(?P<value>[\d,.]+)\s*(?P<unit>kW|MW|kVA)",
        ),
        (
            FactField.COOLING_CAPACITY_KW,
            r"(?:Cooling\s*Capacity|Refrigeration\s*Capacity|Thermal\s*Rating)\s*[:\-]?\s*(?P<value>[\d,.]+)\s*(?P<unit>kW|MW|TR|Tons?)",
        ),
        (
            FactField.WIDTH_M,
            r"(?:Equipment\s*)?(?:Width|Clearance|Chassis\s*Width)\s*[:\-]?\s*(?P<value>[\d,.]+)\s*(?P<unit>mm|m|cm)",
        ),
        (
            FactField.EMBODIED_CARBON,
            r"(?:Embodied\s*Carbon(?:\s*Factor)?|Carbon\s*Footprint|CO2\s*Factor)\s*[:\-]?\s*(?P<value>[\d,.]+)\s*(?P<unit>kgCO2e(?:/ton)?|tCO2e(?:/ton)?)",
        ),
        (
            FactField.WATER_EVAP_GPM,
            r"(?:Water\s*Evaporation|Water\s*Consumption|Evap(?:oration)?\s*Rate)\s*[:\-]?\s*(?P<value>[\d,.]+)\s*(?P<unit>gpm|l/hr|lph)",
        ),
        (
            FactField.FLOOR_LOAD_KG,
            r"(?:Floor\s*Load|Equipment\s*Weight|Operating\s*Weight|Chassis\s*Weight)\s*[:\-]?\s*(?P<value>[\d,.]+)\s*(?P<unit>kg|tonnes?|ton)",
        ),
    )

    @staticmethod
    def extract_from_pdf_bytes(
        raw_pdf: bytes,
        filename: str = "uploaded_bid.pdf",
        submission_ip: str | None = None,
        project_id: str | None = None,
    ) -> VendorBidExtract:
        resolved_project = project_id or os.getenv("PO_LICE_PROJECT_ID", "PRJ-AMBER-01")
        try:
            document = fitz.open(stream=raw_pdf, filetype="pdf")
            try:
                pages = [(page.number + 1, page.get_text(), page) for page in document]
                text = "\n".join(page_text for _, page_text, _ in pages)

                doc_meta = DocumentMetadata.model_validate(
                    BidIntegrityService.inspect_pdf_metadata(raw_pdf, filename)
                )

                # Stage S1 & S2: Scanned PDF Detection & OCR Fallback Engine
                text_is_sparse = not text.strip() or len(text.strip()) < 50
                needs_ocr = text_is_sparse

                if not needs_ocr:
                    # Quick extraction pass to see if we're missing critical data
                    quick_candidates = PDFExtractorService._deterministic_candidates(text)
                    has_images = any(len(page.get_images()) > 0 for _, _, page in pages)
                    if len(quick_candidates) < 3 and has_images:
                        needs_ocr = True

                if needs_ocr:
                    if "SCANNED_PDF_IMAGE_DETECTED" not in doc_meta.review_signals:
                        doc_meta.review_signals.append("SCANNED_PDF_IMAGE_DETECTED")
                    if "OCR_FALLBACK_RECOMMENDED" not in doc_meta.parser_warnings:
                        doc_meta.parser_warnings.append("OCR_FALLBACK_RECOMMENDED")

                    # Trigger Stage S2 Multi-Engine OCR Fallback (Tesseract -> EasyOCR -> Block Fallback)
                    ocr_text, page_details = OCREngineService.run_ocr_on_pdf_bytes(raw_pdf, dpi=300)
                    if ocr_text.strip():
                        # Append OCR text to native text to prevent data loss in mixed-media PDFs
                        text = text + "\n\n--- OCR FALLBACK TEXT ---\n" + ocr_text
                        pages = [
                            (num, pt + "\n" + (page_details[i]["text"] if i < len(page_details) else ""), page)
                            for i, (num, pt, page) in enumerate(pages)
                        ]
                        if "OCR_TEXT_EXTRACTED" not in doc_meta.review_signals:
                            doc_meta.review_signals.append("OCR_TEXT_EXTRACTED")

                # Stage S4: Legal Clause Segmentation & Syntactic Parsing
                parsed_clauses = ClauseSegmentationService.segment_clauses(text)
                if parsed_clauses and "LEGAL_CLAUSES_PARSED" not in doc_meta.review_signals:
                    doc_meta.review_signals.append("LEGAL_CLAUSES_PARSED")

                extracted = PDFExtractorService.parse_bid_text(
                    text,
                    submission_ip=submission_ip,
                    pdf_fingerprint=hashlib.sha256(raw_pdf).hexdigest(),
                    document_metadata=doc_meta,
                    extracted_clauses=parsed_clauses,
                )

                # Stage S3: Multi-Column Table Extraction & Normalization
                table_structs, table_candidates = TableExtractionService.extract_tables_from_pdf_bytes(raw_pdf)
                if table_candidates:
                    if "TABLE_FACTS_EXTRACTED" not in doc_meta.review_signals:
                        doc_meta.review_signals.append("TABLE_FACTS_EXTRACTED")
                    # Merge table candidates into extraction report if field missing
                    existing_fields = {c.field for c in extracted.extraction_report.candidates}
                    for tc in table_candidates:
                        if tc.field not in existing_fields:
                            extracted.extraction_report.candidates.append(tc)
                            existing_fields.add(tc.field)



                # CAD Drawing Intelligence Aspect
                cad_annotations, cad_signals = CADDrawingIntelligenceService.extract_cad_annotations(raw_pdf)
                for sig in cad_signals:
                    if sig not in doc_meta.review_signals:
                        doc_meta.review_signals.append(sig)

                enriched = ExtractionCascade().enrich(text, extracted, resolved_project)
                located_report = PDFExtractorService._locate_candidates(
                    enriched.extraction_report,
                    pages,
                )
                if cad_annotations:
                    located_report = located_report.model_copy(update={"dimension_annotations": cad_annotations})

                # Stage S6: Candidate Confidence Scoring & Reviewer Threshold Gate (< 0.85)
                scored_report, has_low_confidence = ConfidenceScoringService.score_report_candidates(
                    located_report, text
                )
                if has_low_confidence:
                    if "LOW_CONFIDENCE_FACT_DETECTED" not in doc_meta.review_signals:
                        doc_meta.review_signals.append("LOW_CONFIDENCE_FACT_DETECTED")
                    if "HUMAN_REVIEW_REQUIRED" not in doc_meta.parser_warnings:
                        doc_meta.parser_warnings.append("HUMAN_REVIEW_REQUIRED")

                return enriched.model_copy(update={"extraction_report": scored_report, "document_metadata": doc_meta})
            finally:
                document.close()
        except fitz.FileDataError as error:
            raise ValueError("Invalid or corrupted PDF document.") from error

    @staticmethod
    def extract_from_pdf_path(
        pdf_path: str,
        submission_ip: str | None = None,
        project_id: str | None = None,
    ) -> VendorBidExtract:
        raw_pdf = Path(pdf_path).read_bytes()
        return PDFExtractorService.extract_from_pdf_bytes(
            raw_pdf=raw_pdf,
            filename=Path(pdf_path).name,
            submission_ip=submission_ip,
            project_id=project_id,
        )

    @staticmethod
    def _clauses(text: str) -> list[str]:
        return ClauseSegmentationService.segment_clauses(text)

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
        extracted_clauses: list[str] | None = None,
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
            extracted_clauses=extracted_clauses if extracted_clauses is not None else cls._clauses(text),
            document_metadata=document_metadata or DocumentMetadata(),
            extraction_report=report,
        )
