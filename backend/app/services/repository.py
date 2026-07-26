"""Local durable storage for uploaded procurement records.

This is intentionally SQLite-backed: it gives the local deployment a real
upload-to-review lifecycle without pretending that a remote database exists.
Supabase/PostgreSQL integration is planned but not wired in this iteration.
"""

import hashlib
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from uuid import uuid4

from app.models.schemas import (
    ActivityEvent,
    BidRecord,
    DocketScorecard,
    OfficerDecision,
    RFIDraft,
    SiteConstraintRecord,
    SourceDocumentProvenance,
    VendorBidExtract,
)


class StaleVersionError(Exception):
    """Raised when an expected_version does not match the current version."""


class InvalidTransitionError(Exception):
    """Raised when an officer decision transition is not allowed."""


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
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute("PRAGMA foreign_keys=ON")
        return connection

    def _initialise(self) -> None:
        with self._connect() as connection:
            connection.executescript("""
                CREATE TABLE IF NOT EXISTS bids (
                  id TEXT PRIMARY KEY,
                  filename TEXT NOT NULL,
                  submitted_at TEXT NOT NULL,
                  source_json TEXT NOT NULL,
                  scorecard_json TEXT NOT NULL,
                  stored_file TEXT NOT NULL,
                  project_id TEXT NOT NULL DEFAULT 'PRJ-AMBER-01',
                  media_type TEXT NOT NULL DEFAULT 'application/pdf',
                  byte_length INTEGER NOT NULL DEFAULT 0,
                  sha256 TEXT NOT NULL DEFAULT '',
                  uploader_identity TEXT NOT NULL DEFAULT 'DEMO_OFFICER',
                  ingested_at TEXT NOT NULL DEFAULT '',
                  idempotency_key TEXT,
                  integrity_signals_json TEXT NOT NULL DEFAULT '[]',
                  officer_decision TEXT NOT NULL DEFAULT 'UNDECIDED',
                  version INTEGER NOT NULL DEFAULT 1
                );

                CREATE TABLE IF NOT EXISTS activity (
                  id TEXT PRIMARY KEY,
                  bid_id TEXT NOT NULL,
                  timestamp TEXT NOT NULL,
                  check_name TEXT NOT NULL,
                  action TEXT NOT NULL,
                  rule TEXT NOT NULL,
                  evidence TEXT NOT NULL,
                  FOREIGN KEY (bid_id) REFERENCES bids(id)
                );

                CREATE TABLE IF NOT EXISTS rfis (
                  id TEXT PRIMARY KEY,
                  bid_id TEXT NOT NULL,
                  vendor_name TEXT NOT NULL,
                  status TEXT NOT NULL DEFAULT 'DRAFT',
                  human_reviewed INTEGER NOT NULL DEFAULT 0,
                  rfi_text TEXT NOT NULL,
                  protected_facts_json TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  FOREIGN KEY (bid_id) REFERENCES bids(id)
                );

                CREATE TABLE IF NOT EXISTS site_constraints (
                  id TEXT PRIMARY KEY,
                  project_id TEXT NOT NULL DEFAULT 'PRJ-AMBER-01',
                  version INTEGER NOT NULL,
                  is_current INTEGER NOT NULL DEFAULT 1,
                  max_substation_kw REAL NOT NULL DEFAULT 1200.0,
                  max_door_width_m REAL NOT NULL DEFAULT 1.9,
                  max_embodied_carbon_kg REAL NOT NULL DEFAULT 450.0,
                  actor TEXT NOT NULL DEFAULT 'SYSTEM',
                  reason TEXT NOT NULL DEFAULT 'Initial baseline',
                  created_at TEXT NOT NULL,
                  UNIQUE (project_id, version)
                );
            """)
            columns = {
                "officer_decision": "TEXT NOT NULL DEFAULT 'UNDECIDED'",
                "version": "INTEGER NOT NULL DEFAULT 1",
                "project_id": "TEXT NOT NULL DEFAULT 'PRJ-AMBER-01'",
                "media_type": "TEXT NOT NULL DEFAULT 'application/pdf'",
                "byte_length": "INTEGER NOT NULL DEFAULT 0",
                "sha256": "TEXT NOT NULL DEFAULT ''",
                "uploader_identity": "TEXT NOT NULL DEFAULT 'DEMO_OFFICER'",
                "ingested_at": "TEXT NOT NULL DEFAULT ''",
                "idempotency_key": "TEXT",
                "integrity_signals_json": "TEXT NOT NULL DEFAULT '[]'",
            }
            existing_columns = {
                row["name"] for row in connection.execute("PRAGMA table_info(bids)").fetchall()
            }
            for name, definition in columns.items():
                if name not in existing_columns:
                    connection.execute(f"ALTER TABLE bids ADD COLUMN {name} {definition}")

            connection.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS idx_bids_project_idempotency
                ON bids(project_id, uploader_identity, idempotency_key)
                WHERE idempotency_key IS NOT NULL
                """
            )
            connection.executescript(
                """
                CREATE TRIGGER IF NOT EXISTS immutable_bid_source
                BEFORE UPDATE OF filename, submitted_at, stored_file, project_id,
                    media_type, byte_length, sha256, uploader_identity, ingested_at
                ON bids
                BEGIN
                  SELECT RAISE(ABORT, 'source document provenance is immutable');
                END;
                """
            )

            # Seed default constraints if none exist
            row = connection.execute(
                "SELECT COUNT(*) AS cnt FROM site_constraints WHERE project_id = 'PRJ-AMBER-01'"
            ).fetchone()
            if row["cnt"] == 0:
                connection.execute(
                    "INSERT INTO site_constraints VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        str(uuid4()), "PRJ-AMBER-01", 1, 1,
                        1200.0, 1.9, 450.0,
                        "SYSTEM", "Initial baseline constraint version",
                        datetime.now(timezone.utc).isoformat(),
                    ),
                )

    # ── Bid CRUD ─────────────────────────────────────────────────────────

    def _record(self, row: sqlite3.Row) -> BidRecord:
        source = VendorBidExtract.model_validate_json(row["source_json"])
        sha256 = row["sha256"] or source.pdf_fingerprint
        if not sha256:
            source_file = self.uploads_path / row["stored_file"]
            if source_file.is_file():
                sha256 = hashlib.sha256(source_file.read_bytes()).hexdigest()
            else:
                raise RuntimeError(f"Source provenance unavailable for bid {row['id']}")
        ingestion_time = row["ingested_at"] or row["submitted_at"]
        return BidRecord(
            id=row["id"],
            filename=row["filename"],
            submitted_at=row["submitted_at"],
            source=source,
            source_document=SourceDocumentProvenance(
                project_id=row["project_id"],
                storage_reference=f"uploads/{row['stored_file']}",
                sha256=sha256,
                original_filename=row["filename"],
                media_type=row["media_type"],
                byte_length=row["byte_length"],
                uploader_identity=row["uploader_identity"],
                ingestion_time=ingestion_time,
                integrity_signals=json.loads(row["integrity_signals_json"]),
            ),
            scorecard=DocketScorecard.model_validate_json(row["scorecard_json"]),
            officer_decision=OfficerDecision(row["officer_decision"]),
            version=row["version"],
        )

    def save_bid(
        self,
        filename: str,
        contents: bytes,
        source: VendorBidExtract,
        scorecard: DocketScorecard,
        *,
        project_id: str = "PRJ-AMBER-01",
        uploader_identity: str = "DEMO_OFFICER",
        media_type: str = "application/pdf",
        idempotency_key: str | None = None,
        integrity_signals: list[str] | None = None,
    ) -> BidRecord:
        if idempotency_key:
            replay = self.get_bid_by_idempotency(
                project_id,
                uploader_identity,
                idempotency_key,
            )
            if replay:
                return replay
        record_id = str(uuid4())
        submitted_at = datetime.now(timezone.utc).isoformat()
        stored_file = f"{record_id}.pdf"
        document_sha256 = hashlib.sha256(contents).hexdigest()
        if source.pdf_fingerprint and source.pdf_fingerprint != document_sha256:
            raise ValueError("Source fingerprint does not match the uploaded bytes")
        persisted_source = source.model_copy(update={"pdf_fingerprint": document_sha256})
        persisted_scorecard = scorecard.model_copy(update={"bid_id": record_id})
        source_path = self.uploads_path / stored_file
        try:
            with self._lock, self._connect() as connection:
                if idempotency_key:
                    replay = connection.execute(
                        """
                        SELECT * FROM bids
                        WHERE project_id = ? AND uploader_identity = ? AND idempotency_key = ?
                        """,
                        (project_id, uploader_identity, idempotency_key),
                    ).fetchone()
                    if replay:
                        return self._record(replay)
                source_path.write_bytes(contents)
                connection.execute(
                    """
                    INSERT INTO bids (
                        id, filename, submitted_at, source_json, scorecard_json,
                        stored_file, project_id, media_type, byte_length, sha256,
                        uploader_identity, ingested_at, idempotency_key,
                        integrity_signals_json, officer_decision, version
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        record_id, filename, submitted_at,
                        persisted_source.model_dump_json(), persisted_scorecard.model_dump_json(),
                        stored_file, project_id, media_type, len(contents),
                        document_sha256, uploader_identity, submitted_at,
                        idempotency_key, json.dumps(integrity_signals or []),
                        OfficerDecision.UNDECIDED.value, 1,
                    ),
                )
                for result in persisted_scorecard.patrol_results:
                    self._append(
                        connection, record_id,
                        result.patrol_name, result.status,
                        result.rule_broken or "No exception rule", result.reason,
                    )
        except sqlite3.IntegrityError:
            source_path.unlink(missing_ok=True)
            if idempotency_key:
                replay = self.get_bid_by_idempotency(
                    project_id,
                    uploader_identity,
                    idempotency_key,
                )
                if replay:
                    return replay
            raise
        except Exception:
            source_path.unlink(missing_ok=True)
            raise
        return BidRecord(
            id=record_id, filename=filename, submitted_at=submitted_at,
            source=persisted_source,
            source_document=SourceDocumentProvenance(
                project_id=project_id,
                storage_reference=f"uploads/{stored_file}",
                sha256=document_sha256,
                original_filename=filename,
                media_type=media_type,
                byte_length=len(contents),
                uploader_identity=uploader_identity,
                ingestion_time=submitted_at,
                integrity_signals=integrity_signals or [],
            ),
            scorecard=persisted_scorecard,
            officer_decision=OfficerDecision.UNDECIDED, version=1,
        )

    def get_bid_by_idempotency(
        self,
        project_id: str,
        uploader_identity: str,
        idempotency_key: str,
    ) -> BidRecord | None:
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT * FROM bids
                WHERE project_id = ? AND uploader_identity = ? AND idempotency_key = ?
                """,
                (project_id, uploader_identity, idempotency_key),
            ).fetchone()
        return self._record(row) if row else None

    def find_by_fingerprint(self, project_id: str, sha256: str) -> BidRecord | None:
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT * FROM bids
                WHERE project_id = ? AND sha256 = ?
                ORDER BY submitted_at, id
                LIMIT 1
                """,
                (project_id, sha256),
            ).fetchone()
        return self._record(row) if row else None

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
            connection.execute("DELETE FROM rfis WHERE bid_id = ?", (record_id,))
            connection.execute("DELETE FROM activity WHERE bid_id = ?", (record_id,))
            connection.execute("DELETE FROM bids WHERE id = ?", (record_id,))
        source_path = self.uploads_path / row["stored_file"]
        if source_path.exists():
            source_path.unlink()
        return True

    # ── Officer Decision (optimistic concurrency) ────────────────────────

    def update_officer_decision(
        self,
        bid_id: str,
        decision: OfficerDecision,
        expected_version: int,
        actor: str,
        reason: str,
    ) -> BidRecord:
        """Atomically update officer decision with optimistic concurrency.

        Raises StaleVersionError if expected_version does not match.
        Raises KeyError if bid_id does not exist.
        """
        with self._lock, self._connect() as connection:
            row = connection.execute("SELECT * FROM bids WHERE id = ?", (bid_id,)).fetchone()
            if not row:
                raise KeyError(f"Bid {bid_id} not found")
            if row["version"] != expected_version:
                raise StaleVersionError(
                    f"Expected version {expected_version}, current is {row['version']}"
                )
            current_decision = OfficerDecision(row["officer_decision"])
            allowed_transitions = {
                OfficerDecision.UNDECIDED: {
                    OfficerDecision.AWARDED,
                    OfficerDecision.REJECTED,
                    OfficerDecision.RFI_PENDING,
                },
                OfficerDecision.RFI_PENDING: {
                    OfficerDecision.UNDECIDED,
                    OfficerDecision.AWARDED,
                    OfficerDecision.REJECTED,
                },
                OfficerDecision.AWARDED: set(),
                OfficerDecision.REJECTED: set(),
            }
            if decision not in allowed_transitions[current_decision]:
                raise InvalidTransitionError(
                    f"Cannot change officer decision from {current_decision.value} to {decision.value}"
                )
            new_version = expected_version + 1
            connection.execute(
                "UPDATE bids SET officer_decision = ?, version = ? WHERE id = ?",
                (decision.value, new_version, bid_id),
            )
            self._append(
                connection, bid_id,
                "OFFICER_DECISION",
                f"DECISION_CHANGE_{decision.value}",
                "OFFICER_REVIEW",
                f"{actor}: {reason}",
            )
        return self.get_bid(bid_id)  # type: ignore[return-value]

    # ── Activity Log ─────────────────────────────────────────────────────

    @staticmethod
    def _append(
        connection: sqlite3.Connection,
        bid_id: str,
        check_name: str,
        action: str,
        rule: str,
        evidence: str,
    ) -> None:
        connection.execute(
            "INSERT INTO activity VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                str(uuid4()), bid_id,
                datetime.now(timezone.utc).isoformat(),
                check_name, action, rule, evidence,
            ),
        )

    def add_action(self, bid_id: str, action: str, note: str) -> ActivityEvent | None:
        if not self.get_bid(bid_id):
            return None
        timestamp = datetime.now(timezone.utc).isoformat()
        event = ActivityEvent(
            id=str(uuid4()), bid_id=bid_id, timestamp=timestamp,
            check_name="REVIEWER_ACTION", action=action,
            rule="HUMAN_REVIEW_REQUIRED", evidence=note,
        )
        with self._lock, self._connect() as connection:
            connection.execute(
                "INSERT INTO activity VALUES (?, ?, ?, ?, ?, ?, ?)",
                (event.id, event.bid_id, event.timestamp, event.check_name, event.action, event.rule, event.evidence),
            )
        return event

    def activity(self, bid_id: str | None = None) -> list[ActivityEvent]:
        query, params = (
            ("SELECT * FROM activity WHERE bid_id = ? ORDER BY timestamp DESC", (bid_id,))
            if bid_id
            else ("SELECT * FROM activity ORDER BY timestamp DESC", ())
        )
        with self._connect() as connection:
            rows = connection.execute(query, params).fetchall()
        return [
            ActivityEvent(
                id=row["id"], bid_id=row["bid_id"], timestamp=row["timestamp"],
                check_name=row["check_name"], action=row["action"],
                rule=row["rule"], evidence=row["evidence"],
            )
            for row in rows
        ]

    # ── RFI Persistence ──────────────────────────────────────────────────

    def save_rfi_draft(
        self,
        bid_id: str,
        vendor_name: str,
        rfi_text: str,
        protected_facts: dict,
    ) -> RFIDraft:
        """Persist an RFI draft. Status is always DRAFT; human_reviewed is always False."""
        rfi_id = f"RFI-{str(uuid4())[:8].upper()}"
        created_at = datetime.now(timezone.utc).isoformat()
        with self._lock, self._connect() as connection:
            connection.execute(
                "INSERT INTO rfis (id, bid_id, vendor_name, status, human_reviewed, rfi_text, protected_facts_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (rfi_id, bid_id, vendor_name, "DRAFT", 0, rfi_text, json.dumps(protected_facts), created_at),
            )
            self._append(connection, bid_id, "RFI_GENERATION", "RFI_DRAFT_CREATED", "AUTOMATED_DRAFT", f"RFI {rfi_id} generated from patrol findings")
        return RFIDraft(
            rfi_id=rfi_id, bid_id=bid_id, vendor_name=vendor_name,
            status="DRAFT", human_reviewed=False,
            rfi_text=rfi_text, protected_facts=protected_facts,
            created_at=created_at,
        )

    def get_rfi(self, rfi_id: str) -> RFIDraft | None:
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM rfis WHERE id = ?", (rfi_id,)).fetchone()
        if not row:
            return None
        return RFIDraft(
            rfi_id=row["id"], bid_id=row["bid_id"], vendor_name=row["vendor_name"],
            status=row["status"], human_reviewed=bool(row["human_reviewed"]),
            rfi_text=row["rfi_text"],
            protected_facts=json.loads(row["protected_facts_json"]),
            created_at=row["created_at"],
        )

    def approve_rfi(self, rfi_id: str, edited_text: str, actor: str, note: str) -> RFIDraft:
        """Approve an RFI draft. This is a separate action from generation.

        Raises KeyError if rfi_id does not exist.
        Raises ValueError if the RFI is not in DRAFT status.
        """
        with self._lock, self._connect() as connection:
            row = connection.execute("SELECT * FROM rfis WHERE id = ?", (rfi_id,)).fetchone()
            if not row:
                raise KeyError(f"RFI {rfi_id} not found")
            if row["status"] != "DRAFT":
                raise ValueError(f"RFI {rfi_id} is not in DRAFT status (current: {row['status']})")
            connection.execute(
                "UPDATE rfis SET status = 'APPROVED', human_reviewed = 1, rfi_text = ? WHERE id = ?",
                (edited_text, rfi_id),
            )
            self._append(
                connection, row["bid_id"],
                "RFI_APPROVAL", "RFI_APPROVED",
                "HUMAN_REVIEW_COMPLETED", f"{actor}: {note}",
            )
        return self.get_rfi(rfi_id)  # type: ignore[return-value]

    def list_rfis(self, bid_id: str | None = None) -> list[RFIDraft]:
        if bid_id:
            query, params = "SELECT * FROM rfis WHERE bid_id = ? ORDER BY created_at DESC", (bid_id,)
        else:
            query, params = "SELECT * FROM rfis ORDER BY created_at DESC", ()
        with self._connect() as connection:
            rows = connection.execute(query, params).fetchall()
        return [
            RFIDraft(
                rfi_id=row["id"], bid_id=row["bid_id"], vendor_name=row["vendor_name"],
                status=row["status"], human_reviewed=bool(row["human_reviewed"]),
                rfi_text=row["rfi_text"],
                protected_facts=json.loads(row["protected_facts_json"]),
                created_at=row["created_at"],
            )
            for row in rows
        ]

    # ── Site Constraints ─────────────────────────────────────────────────

    def get_current_constraints(self, project_id: str = "PRJ-AMBER-01") -> SiteConstraintRecord | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM site_constraints WHERE project_id = ? AND is_current = 1",
                (project_id,),
            ).fetchone()
        if not row:
            return None
        return SiteConstraintRecord(
            id=row["id"], project_id=row["project_id"], version=row["version"],
            is_current=bool(row["is_current"]),
            max_substation_kw=row["max_substation_kw"],
            max_door_width_m=row["max_door_width_m"],
            max_embodied_carbon_kg=row["max_embodied_carbon_kg"],
            actor=row["actor"], reason=row["reason"],
            created_at=row["created_at"],
        )

    def update_constraints(
        self,
        expected_version: int,
        max_substation_kw: float,
        max_door_width_m: float,
        max_embodied_carbon_kg: float,
        actor: str,
        reason: str,
        project_id: str = "PRJ-AMBER-01",
    ) -> SiteConstraintRecord:
        """Create a new constraint version with optimistic concurrency.

        Raises StaleVersionError if expected_version does not match.
        Raises KeyError if no constraints exist for the project.
        """
        with self._lock, self._connect() as connection:
            current = connection.execute(
                "SELECT * FROM site_constraints WHERE project_id = ? AND is_current = 1",
                (project_id,),
            ).fetchone()
            if not current:
                raise KeyError(f"No constraints found for project {project_id}")
            if current["version"] != expected_version:
                raise StaleVersionError(
                    f"Expected version {expected_version}, current is {current['version']}"
                )
            new_version = expected_version + 1
            new_id = str(uuid4())
            created_at = datetime.now(timezone.utc).isoformat()
            # Mark old version as not current
            connection.execute(
                "UPDATE site_constraints SET is_current = 0 WHERE id = ?",
                (current["id"],),
            )
            # Insert new version
            connection.execute(
                "INSERT INTO site_constraints VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    new_id, project_id, new_version, 1,
                    max_substation_kw, max_door_width_m, max_embodied_carbon_kg,
                    actor, reason, created_at,
                ),
            )
        return SiteConstraintRecord(
            id=new_id, project_id=project_id, version=new_version,
            is_current=True,
            max_substation_kw=max_substation_kw,
            max_door_width_m=max_door_width_m,
            max_embodied_carbon_kg=max_embodied_carbon_kg,
            actor=actor, reason=reason, created_at=created_at,
        )


bid_repository = BidRepository()
