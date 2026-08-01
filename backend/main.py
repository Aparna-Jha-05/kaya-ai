"""HTTP boundary for PO-LICE's procurement evidence service."""

import logging
import os
import re
import tempfile
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.models.schemas import (
    ActivityEvent,
    BidRecord,
    ConstraintUpdateRequest,
    OfficerDecisionRequest,
    RFIApprovalRequest,
    RFIDraft,
    ReviewerActionRequest,
    SiteConstraintRecord,
    SimulationRequest,
    SimulationResponse,
)
from app.services.extractor import PDFExtractorService
from app.services.integrity import bid_integrity_matrix
from app.services.patrols import ConstraintGraph, PatrolEngineService
from app.services.repository import InvalidTransitionError, StaleVersionError, bid_repository
from app.services.rfi import RFIService
from app.db.supabase import check_db_readiness, settings

logger = logging.getLogger(__name__)
MAX_PDF_BYTES = 15 * 1024 * 1024
PDF_MAGIC = b"%PDF-"
allowed_origins = [origin.strip() for origin in os.getenv("PO_LICE_ALLOWED_ORIGINS", "http://localhost:3000").split(",") if origin.strip()]
DEMO_MODE = settings.demo_mode
PROJECT_ID = os.getenv("PO_LICE_PROJECT_ID", "PRJ-POLICE-01")
DEMO_ACTOR = "DEMO_OFFICER"

app = FastAPI(title="PO-LICE API", description="Deterministic procurement evidence and scenario modeling.", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Idempotency-Key"],
)


@app.on_event("startup")
def bootstrap_demo_fixtures() -> None:
    if DEMO_MODE:
        try:
            from scripts.seed_demo_data import seed
            seed(verbose=False)
            logger.info("Idempotent demo fixtures bootstrapped successfully.")
        except Exception as err:
            logger.warning("Demo fixture bootstrap warning: %s", err)


# ── System ───────────────────────────────────────────────────────────────

@app.get("/", tags=["system"])
def read_root() -> dict[str, str]:
    return {"system": "PO-LICE API", "status": "online", "decision_model": "deterministic", "version": "2.0.0"}


@app.get("/api/v1/readiness", tags=["system"])
async def readiness_check() -> Dict[str, Any]:
    """Disclose whether SQLite/demo or PostgreSQL is active."""
    pg_status = await check_db_readiness()
    return {
        "status": "healthy" if DEMO_MODE else "unhealthy",
        "demo_mode": DEMO_MODE,
        "persistence": "sqlite" if DEMO_MODE else "unavailable",
        "postgresql": pg_status,
    }


# ── Bid Upload & CRUD ───────────────────────────────────────────────────

class RFIDraftRequest(BaseModel):
    bid_id: str


def require_demo_persistence() -> None:
    if not DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Persistent PostgreSQL mode is not implemented. Enable DEMO_MODE for the SQLite prototype.",
        )


@app.post("/api/v1/bids/upload", response_model=BidRecord, tags=["bids"])
async def upload_and_audit_bid(request: Request, file: UploadFile = File(...)) -> BidRecord:
    """Validate and analyse one PDF. Source text is extracted; patrols make the decision."""
    require_demo_persistence()
    idempotency_key = request.headers.get("Idempotency-Key")
    if idempotency_key and not re.fullmatch(r"[A-Za-z0-9._:-]{1,128}", idempotency_key):
        await file.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Idempotency-Key must contain 1-128 letters, numbers, dots, underscores, colons, or hyphens.",
        )
    if idempotency_key:
        replay = bid_repository.get_bid_by_idempotency(
            PROJECT_ID,
            DEMO_ACTOR,
            idempotency_key,
        )
        if replay:
            await file.close()
            return replay
    filename = Path(file.filename or "").name
    if len(filename) > 512:
        await file.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PDF filename exceeds 512 characters.",
        )
    if Path(filename).suffix.lower() != ".pdf":
        await file.close()
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Upload a PDF document.")
    if file.content_type not in (None, "", "application/pdf", "application/octet-stream"):
        await file.close()
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Upload a PDF document.",
        )
    declared_size = file.size
    if declared_size is not None and declared_size > MAX_PDF_BYTES:
        await file.close()
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="PDF exceeds the 15 MB upload limit.")

    contents = await file.read(MAX_PDF_BYTES + 1)
    await file.close()
    if len(contents) > MAX_PDF_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="PDF exceeds the 15 MB upload limit.")
    if not contents.startswith(PDF_MAGIC):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="The uploaded file is not a valid PDF.")

    temp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temporary_file:
            temporary_file.write(contents)
            temp_path = temporary_file.name
        submission_ip = request.client.host if request.client else None
        extracted_bid = PDFExtractorService.extract_from_pdf_path(
            temp_path,
            submission_ip=submission_ip,
            project_id=PROJECT_ID,
        )
        integrity_signals = [
            *extracted_bid.document_metadata.parser_warnings,
            *extracted_bid.document_metadata.review_signals,
        ]
        duplicate = bid_repository.find_by_fingerprint(
            PROJECT_ID,
            extracted_bid.pdf_fingerprint or "",
        )
        if duplicate:
            integrity_signals.append(f"DUPLICATE_BYTES:{duplicate.id}")
            metadata = extracted_bid.document_metadata.model_copy(
                update={
                    "review_signals": [
                        *extracted_bid.document_metadata.review_signals,
                        "DUPLICATE_BYTES",
                    ]
                }
            )
            extracted_bid = extracted_bid.model_copy(update={"document_metadata": metadata})
        scorecard = PatrolEngineService.run_all_patrols(extracted_bid)
        record = bid_repository.save_bid(
            filename,
            contents,
            extracted_bid,
            scorecard,
            project_id=PROJECT_ID,
            uploader_identity=DEMO_ACTOR,
            media_type="application/pdf",
            idempotency_key=idempotency_key,
            integrity_signals=integrity_signals,
        )
        bid_integrity_matrix.record(extracted_bid)
        # Auto-generate RFI draft if OSHA cert is provably missing (no manual click needed)
        if extracted_bid.has_osha_cert is False:
            try:
                draft_data = RFIService.generate_rfi_draft(scorecard)
                bid_repository.save_rfi_draft(
                    bid_id=record.id,
                    vendor_name=draft_data["vendor_name"],
                    rfi_text=draft_data["rfi_text"],
                    protected_facts=draft_data["protected_facts"],
                )
                logger.info("Auto-generated RFI draft for bid %s: OSHA certificate missing.", record.id)
            except Exception as rfi_error:
                logger.warning("Auto-RFI generation failed for bid %s: %s", record.id, rfi_error)
        return record
    except (ValueError, RuntimeError) as error:
        logger.info("Bid extraction rejected: %s", error)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="The PDF could not be read as a procurement bid. Review the document and try again.") from error
    except Exception:
        logger.exception("Unexpected bid processing error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="The audit could not be completed. Try again or contact an administrator.")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@app.get("/api/v1/bids", response_model=list[BidRecord], tags=["bids"])
def list_bids() -> list[BidRecord]:
    """Returns all bids as an array. Pagination is not implemented yet to
    preserve backward compatibility with the current frontend contract."""
    return bid_repository.list_bids()


@app.get("/api/v1/bids/{bid_id}", response_model=BidRecord, tags=["bids"])
def get_bid(bid_id: str) -> BidRecord:
    record = bid_repository.get_bid(bid_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bid not found.")
    return record


@app.get("/api/v1/bids/{bid_id}/source", tags=["bids"])
def download_source(bid_id: str) -> FileResponse:
    source_path = bid_repository.source_path(bid_id)
    if not source_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source PDF not found.")
    return FileResponse(source_path, media_type="application/pdf", filename=f"{bid_id}.pdf")


@app.delete("/api/v1/bids/{bid_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["bids"])
def delete_bid(bid_id: str) -> None:
    require_demo_persistence()
    if not bid_repository.remove_bid(bid_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bid not found.")


# ── Officer Decision (separate from procurement lifecycle) ───────────────

@app.patch("/api/v1/bids/{bid_id}/status", response_model=BidRecord, tags=["bids"])
def update_officer_decision(bid_id: str, request: OfficerDecisionRequest) -> BidRecord:
    """Update the officer decision on a bid with optimistic concurrency.

    The frontend sends 'lifecycle_mode' in the body for backward compatibility,
    but this endpoint maps it to the OfficerDecision concept.
    Returns HTTP 409 if expected_version is stale.
    """
    require_demo_persistence()
    try:
        return bid_repository.update_officer_decision(
            bid_id=bid_id,
            decision=request.decision,
            expected_version=request.expected_version,
            actor="DEMO_OFFICER",
            reason=request.reason,
        )
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bid not found.")
    except StaleVersionError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error))
    except InvalidTransitionError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error))


# ── Reviewer Actions ────────────────────────────────────────────────────

@app.post("/api/v1/bids/{bid_id}/actions", response_model=ActivityEvent, tags=["bids"])
def record_reviewer_action(bid_id: str, request: ReviewerActionRequest) -> ActivityEvent:
    require_demo_persistence()
    event = bid_repository.add_action(bid_id, request.action, request.note)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bid not found.")
    return event


@app.get("/api/v1/activity", response_model=list[ActivityEvent], tags=["activity"])
def list_activity(bid_id: str | None = None) -> list[ActivityEvent]:
    return bid_repository.activity(bid_id)


# ── RFI Workflow ─────────────────────────────────────────────────────────

@app.post("/api/v1/agent/rfi-draft", response_model=RFIDraft, tags=["agent"])
def generate_rfi_draft(payload: RFIDraftRequest) -> RFIDraft:
    """Generate and persist a deterministic RFI draft from patrol findings.

    The draft is always created with status=DRAFT and human_reviewed=False.
    Approval is a separate action via PATCH /api/v1/rfis/{rfi_id}/approve.
    """
    require_demo_persistence()
    record = bid_repository.get_bid(payload.bid_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bid not found.")
    draft_data = RFIService.generate_rfi_draft(record.scorecard)
    return bid_repository.save_rfi_draft(
        bid_id=payload.bid_id,
        vendor_name=draft_data["vendor_name"],
        rfi_text=draft_data["rfi_text"],
        protected_facts=draft_data["protected_facts"],
    )


@app.patch("/api/v1/rfis/{rfi_id}/approve", response_model=RFIDraft, tags=["agent"])
def approve_rfi(rfi_id: str, request: RFIApprovalRequest) -> RFIDraft:
    """Approve a persisted RFI draft. This is a separate action from generation."""
    require_demo_persistence()
    try:
        draft = bid_repository.get_rfi(rfi_id)
        if not draft:
            raise KeyError(rfi_id)
        violations = RFIService.validate_edited_text(request.edited_text, draft.protected_facts)
        if violations:
            raise ValueError("; ".join(violations))
        return bid_repository.approve_rfi(
            rfi_id,
            edited_text=request.edited_text,
            actor="DEMO_OFFICER",
            note=request.note,
        )
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFI not found.")
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error))


@app.get("/api/v1/rfis", response_model=list[RFIDraft], tags=["agent"])
def list_rfis(bid_id: str | None = None) -> list[RFIDraft]:
    return bid_repository.list_rfis(bid_id)


# ── Site Constraints ─────────────────────────────────────────────────────

@app.get("/api/v1/site-constraints", response_model=SiteConstraintRecord, tags=["constraints"])
def get_site_constraints() -> SiteConstraintRecord:
    record = bid_repository.get_current_constraints()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No site constraints configured.")
    return record


@app.put("/api/v1/site-constraints", tags=["constraints"])
def update_site_constraints(payload: ConstraintUpdateRequest) -> Dict[str, Any]:
    """Create a new constraint version with optimistic concurrency.

    Returns HTTP 409 if expected_version is stale.
    """
    require_demo_persistence()
    try:
        current = bid_repository.get_current_constraints(PROJECT_ID)
        if not current:
            raise KeyError(PROJECT_ID)
        if current.version != payload.expected_version:
            raise StaleVersionError(
                f"Expected version {payload.expected_version}, current is {current.version}"
            )
        next_version = payload.expected_version + 1
        graph = ConstraintGraph(
            substation_limit_kw=payload.max_substation_kw,
            door_limit_m=payload.max_door_width_m,
            carbon_cap_kgco2e=payload.max_embodied_carbon_kg,
            water_evap_cap_gpm=payload.max_water_evap_gpm,
            floor_load_limit_kg_m2=payload.max_floor_load_kg_m2,
            constraint_source=f"v{next_version} by DEMO_ADMIN",
            constraint_version=next_version,
        )
        reassessments = {
            bid.id: PatrolEngineService.run_all_patrols(bid.source, graph=graph)
            for bid in bid_repository.list_project_bids(PROJECT_ID)
        }
        record = bid_repository.update_constraints(
            expected_version=payload.expected_version,
            max_substation_kw=payload.max_substation_kw,
            max_door_width_m=payload.max_door_width_m,
            max_embodied_carbon_kg=payload.max_embodied_carbon_kg,
            max_water_evap_gpm=payload.max_water_evap_gpm,
            max_floor_load_kg_m2=payload.max_floor_load_kg_m2,
            actor="DEMO_ADMIN",
            reason=payload.reason,
            project_id=PROJECT_ID,
            reassessments=reassessments,
        )
        return {
            "status": "UPDATED",
            "project_id": record.project_id,
            "new_version": record.version,
            "reassessed_bid_count": len(reassessments),
            "constraints": {
                "max_substation_kw": record.max_substation_kw,
                "max_door_width_m": record.max_door_width_m,
                "max_embodied_carbon_kg": record.max_embodied_carbon_kg,
                "max_water_evap_gpm": record.max_water_evap_gpm,
                "max_floor_load_kg_m2": record.max_floor_load_kg_m2,
            },
        }
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No constraints found for this project.")
    except StaleVersionError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error))


# ── Suppliers ────────────────────────────────────────────────────────────

@app.get("/api/v1/suppliers", tags=["suppliers"])
def list_suppliers() -> List[Dict[str, Any]]:
    """Returns static supplier data. Coordinates and risk scores are from
    the seed dataset and do not have verified provenance."""
    return [
        {"vendor_id": "VENDOR-COOLTECH", "name": "CoolTech Global Solutions", "lat": 19.0760, "lng": 72.8777, "distance_km": 14.2, "risk_score": 7.5, "disputes": 3},
        {"vendor_id": "VENDOR-TRANE", "name": "Trane Solutions Pvt Ltd", "lat": 18.5204, "lng": 73.8567, "distance_km": 142.0, "risk_score": 1.2, "disputes": 0},
        {"vendor_id": "VENDOR-CARRIER", "name": "Carrier HVAC India Ltd", "lat": 12.9716, "lng": 77.5946, "distance_km": 840.0, "risk_score": 2.1, "disputes": 0},
    ]


# ── Audit Logs ───────────────────────────────────────────────────────────

@app.get("/api/v1/audit/logs", tags=["audit"])
def list_audit_logs() -> List[Dict[str, Any]]:
    activity_events = bid_repository.activity()
    return [
        {
            "id": event.id,
            "actor": "OFFICER",
            "action": event.action,
            "target_id": event.bid_id,
            "details": {"note": event.evidence},
            "timestamp": event.timestamp,
        }
        for event in activity_events
    ]


# ── Simulation ───────────────────────────────────────────────────────────

@app.post("/api/v1/bids/simulate", response_model=SimulationResponse, tags=["bids"])
def simulate_bid(request: SimulationRequest) -> SimulationResponse:
    """Recalculate the Dynamic Docket from bounded, deterministic inputs."""
    return PatrolEngineService.simulate(request)
