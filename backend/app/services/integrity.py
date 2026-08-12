"""
Bid Integrity and Document Provenance Service
Provides SHA-256 fingerprinting, exact-byte duplicate detection,
and metadata anomaly inspection without assigning speculative fraud labels.
"""

import hashlib
import logging
import re
from threading import Lock
from typing import Optional, Dict, Any, List
import pymupdf as fitz
from app.models.schemas import VendorBidExtract

logger = logging.getLogger(__name__)

class BidIntegrityService:
    def __init__(self) -> None:
        self._bids: List[VendorBidExtract] = []
        self._lock = Lock()

    @staticmethod
    def compute_sha256(contents: bytes) -> str:
        """Calculate exact SHA-256 fingerprint of file contents."""
        return hashlib.sha256(contents).hexdigest()

    @staticmethod
    def inspect_pdf_metadata(file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """Extract metadata properties and record anomaly review signals."""
        result: Dict[str, Any] = {
            "author": None,
            "creation_date": None,
            "modification_date": None,
            "creator_tool": None,
            "producer": None,
            "is_encrypted": False,
            "parser_warnings": [],
            "review_signals": [],
        }
        document = None
        try:
            document = fitz.open(stream=file_bytes, filetype="pdf")
            metadata = document.metadata or {}
            result.update(
                author=metadata.get("author") or None,
                creation_date=metadata.get("creationDate") or None,
                modification_date=metadata.get("modDate") or None,
                creator_tool=metadata.get("creator") or None,
                producer=metadata.get("producer") or None,
                is_encrypted=bool(document.is_encrypted),
            )
            for field, value in (
                ("CREATION_DATE", result["creation_date"]),
                ("MODIFICATION_DATE", result["modification_date"]),
                ("PRODUCER", result["producer"]),
            ):
                if not value:
                    result["review_signals"].append(f"METADATA_UNAVAILABLE:{field}")

            def timestamp(value: str | None) -> str | None:
                if not value:
                    return None
                match = re.match(r"(?:D:)?(\d{4}(?:\d{2}){0,5})", value)
                return match.group(1).ljust(14, "0") if match else None

            created = timestamp(result["creation_date"])
            modified = timestamp(result["modification_date"])
            if created and modified and modified < created:
                result["review_signals"].append("MODIFICATION_BEFORE_CREATION")
            if document.is_repaired:
                result["parser_warnings"].append("PDF_STRUCTURE_REPAIRED")
            has_text = any(page.get_text().strip() for page in document)
            if not has_text:
                result["review_signals"].append("NO_READABLE_TEXT_LAYER")
        except Exception as exc:
            logger.warning("Error inspecting PDF metadata for %s: %s", filename, exc)
            result["parser_warnings"].append("PDF_METADATA_PARSE_WARNING")
        finally:
            if document is not None:
                document.close()
        return result

    def correlations(self, candidate: VendorBidExtract, existing_bids: Optional[List[VendorBidExtract]] = None) -> dict[str, list[str]]:
        with self._lock:
            target_bids = existing_bids if existing_bids is not None else self._bids
            fields = ("submission_ip", "pdf_fingerprint", "bank_account")
            signals: dict[str, list[str]] = {}
            for field in fields:
                value = getattr(candidate, field, None)
                if not value:
                    continue
                matches = [bid.vendor_id for bid in target_bids if bid.vendor_id != candidate.vendor_id and getattr(bid, field, None) == value]
                if matches:
                    signals[field] = matches
            return signals

    def record(self, bid: VendorBidExtract) -> None:
        with self._lock:
            self._bids = [known for known in self._bids if known.vendor_id != bid.vendor_id]
            self._bids.append(bid)
            self._bids = self._bids[-1_000:]

bid_integrity_matrix = BidIntegrityService()
