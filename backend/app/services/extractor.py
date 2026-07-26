"""Conservative PDF extraction. Missing evidence stays missing; it is never invented."""

import hashlib
import re
from pathlib import Path

import fitz

from app.models.schemas import DocumentMetadata, EquipmentSpec, VendorBidExtract


class PDFExtractorService:
    @staticmethod
    def extract_from_pdf_path(pdf_path: str, submission_ip: str | None = None) -> VendorBidExtract:
        raw_pdf = Path(pdf_path).read_bytes()
        try:
            document = fitz.open(pdf_path)
            try:
                text = "\n".join(page.get_text() for page in document)
                metadata = document.metadata or {}
            finally:
                document.close()
        except fitz.FileDataError as error:
            raise ValueError("Invalid or corrupted PDF") from error
        if not text.strip():
            raise ValueError("PDF has no extractable text")
        return PDFExtractorService.parse_bid_text(
            text, submission_ip=submission_ip, pdf_fingerprint=hashlib.sha256(raw_pdf).hexdigest(),
            document_metadata=DocumentMetadata(author=metadata.get("author") or None,
                creation_date=metadata.get("creationDate") or None,
                creator_tool=metadata.get("creator") or metadata.get("producer") or None),
        )

    @staticmethod
    def _number(text: str, pattern: str) -> float | None:
        match = re.search(pattern, text, re.IGNORECASE)
        return float(match.group(1).replace(",", "")) if match else None

    @staticmethod
    def _clauses(text: str) -> list[str]:
        terms = ("warranty", "limitation of liability", "indemnity", "termination", "payment terms")
        return [line.strip(" -\t")[:500] for line in text.splitlines() if line.strip() and any(term in line.lower() for term in terms)][:50]

    @classmethod
    def parse_bid_text(cls, text: str, submission_ip: str | None = None, pdf_fingerprint: str | None = None,
                       document_metadata: DocumentMetadata | None = None) -> VendorBidExtract:
        vendor_match = re.search(r"(?:VENDOR|Vendor\s*Name)\s*:\s*([^\n]+)", text, re.IGNORECASE)
        vendor_name = vendor_match.group(1).strip() if vendor_match else "Unidentified vendor"
        vendor_id = f"VENDOR-{hashlib.sha256(vendor_name.casefold().encode()).hexdigest()[:12].upper()}"
        model_match = re.search(r"(?:Equipment\s*Model|Model\s*Number)\s*:\s*([^\n]+)", text, re.IGNORECASE)
        model_number = model_match.group(1).strip()[:120] if model_match else "Not stated"
        bank_match = re.search(r"(?:bank\s*(?:account|a/c)|beneficiary\s*account)\s*[:#-]?\s*([A-Z0-9-]{6,})", text, re.IGNORECASE)
        delivery_match = re.search(r"Promised\s*Delivery(?:\s*SLA)?\s*:\s*(\d+)\s*Weeks", text, re.IGNORECASE)
        has_osha: bool | None = None
        if re.search(r"OSHA.*(?:PENDING|MISSING|NOT\s*ATTACHED)", text, re.IGNORECASE):
            has_osha = False
        elif re.search(r"OSHA.*(?:CERTIFIED|ATTACHED|VALID)", text, re.IGNORECASE):
            has_osha = True

        return VendorBidExtract(
            vendor_id=vendor_id, vendor_name=vendor_name,
            bid_amount_inr=cls._number(text, r"(?:Upfront\s*Capex\s*Price|Upfront\s*Bid\s*Amount)\s*:\s*INR\s*([\d,]+)"),
            promised_delivery_weeks=int(delivery_match.group(1)) if delivery_match else None, has_osha_cert=has_osha,
            equipment=EquipmentSpec(equipment_type="Chiller", manufacturer=vendor_name, model_number=model_number,
                power_draw_kw=cls._number(text, r"(?:Substation\s*Power\s*Draw|Power\s*Consumption)\s*:\s*([\d\.,]+)\s*kW"),
                cooling_capacity_kw=cls._number(text, r"Cooling\s*Capacity\s*:\s*([\d\.,]+)\s*kW"),
                width_m=cls._number(text, r"(?:Equipment\s*)?Width\s*:\s*([\d\.]+)\s*m"),
                embodied_carbon_factor=cls._number(text, r"Embodied\s*Carbon(?:\s*Factor)?\s*:\s*([\d\.]+)\s*kgCO2e")),
            submission_ip=submission_ip, pdf_fingerprint=pdf_fingerprint, bank_account=bank_match.group(1) if bank_match else None,
            extracted_clauses=cls._clauses(text), document_metadata=document_metadata or DocumentMetadata(),
        )
