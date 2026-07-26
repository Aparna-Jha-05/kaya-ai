"""Local durable storage for uploaded procurement records.

This is intentionally SQLite-backed: it gives the local deployment a real
upload-to-review lifecycle without pretending that a remote database exists.
"""

import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from uuid import uuid4

from app.models.schemas import ActivityEvent, BidRecord, DocketScorecard, VendorBidExtract


class BidRepository:
    def __init__(self) -> None:
        root = Path(os.getenv("PO_LICE_DATA_DIR", Path(__file__).resolve().parents[2] / "data"))
        root.mkdir(parents=True, exist_ok=True)
        self.database_path = root / "po_lice.sqlite3"
        self.uploads_path = root / "uploads"
        self.uploads_path.mkdir(exist_ok=True)
        self._lock = Lock()
        self._initialise()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialise(self) -> None:
        with self._connect() as connection:
            connection.executescript("""
                CREATE TABLE IF NOT EXISTS bids (
                  id TEXT PRIMARY KEY, filename TEXT NOT NULL, submitted_at TEXT NOT NULL,
                  source_json TEXT NOT NULL, scorecard_json TEXT NOT NULL, stored_file TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS activity (
                  id TEXT PRIMARY KEY, bid_id TEXT NOT NULL, timestamp TEXT NOT NULL,
                  check_name TEXT NOT NULL, action TEXT NOT NULL, rule TEXT NOT NULL,
                  evidence TEXT NOT NULL, FOREIGN KEY (bid_id) REFERENCES bids(id)
                );
            """)

    @staticmethod
    def _record(row: sqlite3.Row) -> BidRecord:
        return BidRecord(
            id=row["id"], filename=row["filename"], submitted_at=row["submitted_at"],
            source=VendorBidExtract.model_validate_json(row["source_json"]),
            scorecard=DocketScorecard.model_validate_json(row["scorecard_json"]),
        )

    def save_bid(self, filename: str, contents: bytes, source: VendorBidExtract, scorecard: DocketScorecard) -> BidRecord:
        record_id = str(uuid4())
        submitted_at = datetime.now(timezone.utc).isoformat()
        stored_file = f"{record_id}.pdf"
        (self.uploads_path / stored_file).write_bytes(contents)
        with self._lock, self._connect() as connection:
            connection.execute(
                "INSERT INTO bids VALUES (?, ?, ?, ?, ?, ?)",
                (record_id, filename, submitted_at, source.model_dump_json(), scorecard.model_dump_json(), stored_file),
            )
            for result in scorecard.patrol_results:
                self._append(connection, record_id, result.patrol_name, result.status, result.rule_broken or "No exception rule", result.reason)
        return BidRecord(id=record_id, filename=filename, submitted_at=submitted_at, source=source, scorecard=scorecard)

    @staticmethod
    def _append(connection: sqlite3.Connection, bid_id: str, check_name: str, action: str, rule: str, evidence: str) -> None:
        connection.execute("INSERT INTO activity VALUES (?, ?, ?, ?, ?, ?, ?)", (
            str(uuid4()), bid_id, datetime.now(timezone.utc).isoformat(), check_name, action, rule, evidence,
        ))

    def list_bids(self) -> list[BidRecord]:
        with self._connect() as connection:
            rows = connection.execute("SELECT * FROM bids ORDER BY submitted_at DESC").fetchall()
        return [self._record(row) for row in rows]

    def get_bid(self, record_id: str) -> BidRecord | None:
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM bids WHERE id = ?", (record_id,)).fetchone()
        return self._record(row) if row else None

    def source_path(self, record_id: str) -> Path | None:
        with self._connect() as connection:
            row = connection.execute("SELECT stored_file FROM bids WHERE id = ?", (record_id,)).fetchone()
        path = self.uploads_path / row["stored_file"] if row else None
        return path if path and path.is_file() else None

    def remove_bid(self, record_id: str) -> bool:
        with self._lock, self._connect() as connection:
            row = connection.execute("SELECT stored_file FROM bids WHERE id = ?", (record_id,)).fetchone()
            if not row:
                return False
            connection.execute("DELETE FROM activity WHERE bid_id = ?", (record_id,))
            connection.execute("DELETE FROM bids WHERE id = ?", (record_id,))
        source_path = self.uploads_path / row["stored_file"]
        if source_path.exists():
            source_path.unlink()
        return True

    def add_action(self, bid_id: str, action: str, note: str) -> ActivityEvent | None:
        if not self.get_bid(bid_id):
            return None
        timestamp = datetime.now(timezone.utc).isoformat()
        event = ActivityEvent(id=str(uuid4()), bid_id=bid_id, timestamp=timestamp, check_name="REVIEWER_ACTION", action=action, rule="HUMAN_REVIEW_REQUIRED", evidence=note)
        with self._lock, self._connect() as connection:
            connection.execute("INSERT INTO activity VALUES (?, ?, ?, ?, ?, ?, ?)", (
                event.id, event.bid_id, event.timestamp, event.check_name, event.action, event.rule, event.evidence,
            ))
        return event

    def activity(self, bid_id: str | None = None) -> list[ActivityEvent]:
        query, params = ("SELECT * FROM activity WHERE bid_id = ? ORDER BY timestamp DESC", (bid_id,)) if bid_id else ("SELECT * FROM activity ORDER BY timestamp DESC", ())
        with self._connect() as connection:
            rows = connection.execute(query, params).fetchall()
        return [ActivityEvent(id=row["id"], bid_id=row["bid_id"], timestamp=row["timestamp"], check_name=row["check_name"], action=row["action"], rule=row["rule"], evidence=row["evidence"]) for row in rows]


bid_repository = BidRepository()
