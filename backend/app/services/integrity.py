"""Deterministic local Bid Integrity Matrix correlation store.

Production deployments should back this with the `bids` columns in PostgreSQL;
the in-memory store keeps the prototype's upload flow demonstrable without a DB.
"""

from threading import Lock

from app.models.schemas import VendorBidExtract


class BidIntegrityMatrix:
    def __init__(self) -> None:
        self._bids: list[VendorBidExtract] = []
        self._lock = Lock()

    def correlations(self, candidate: VendorBidExtract) -> dict[str, list[str]]:
        fields = ("submission_ip", "pdf_fingerprint", "bank_account")
        signals: dict[str, list[str]] = {}
        with self._lock:
            for field in fields:
                value = getattr(candidate, field)
                if not value:
                    continue
                matches = [bid.vendor_id for bid in self._bids if bid.vendor_id != candidate.vendor_id and getattr(bid, field) == value]
                if matches:
                    signals[field] = matches
        return signals

    def record(self, bid: VendorBidExtract) -> None:
        with self._lock:
            self._bids = [known for known in self._bids if known.vendor_id != bid.vendor_id]
            self._bids.append(bid)
            # Prototype-only retention bound. Production uses PostgreSQL retention policy.
            self._bids = self._bids[-1_000:]


bid_integrity_matrix = BidIntegrityMatrix()
