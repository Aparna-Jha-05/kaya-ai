"""
Bid Integrity and Document Provenance Service
Provides SHA-256 fingerprinting, exact-byte duplicate detection,
and metadata anomaly inspection without assigning speculative fraud labels.
"""

import hashlib
import logging
from threading import Lock
from typing import Optional, Dict, Any, List
import fitz  # PyMuPDF
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
        signals = {
            "is_duplicate_bytes": False,
            "metadata_missing": False,
            "suspicious_creation_date": False,
            "text_layout_anomaly": False,
            "review_notes": []
        }

        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            meta = doc.metadata or {}

            if not meta.get("creationDate"):
                signals["metadata_missing"] = True
                signals["review_notes"].append("PDF metadata creationDate is absent.")

            has_text = any(page.get_text().strip() for page in doc)
            if not has_text:
                signals["text_layout_anomaly"] = True
                signals["review_notes"].append("PDF contains no readable text layer (scan/image PDF).")

            doc.close()
        except Exception as exc:
            logger.warning("Error inspecting PDF metadata: %s", exc)
            signals["review_notes"].append("PDF metadata parsing warning.")

        return signals

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
