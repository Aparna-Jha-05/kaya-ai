"""HTTP boundary for PO-LICE's procurement evidence service."""

import logging
import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.models.schemas import ActivityEvent, BidRecord, ReviewerActionRequest, SimulationRequest, SimulationResponse
from app.services.extractor import PDFExtractorService
from app.services.patrols import PatrolEngineService
from app.services.repository import bid_repository

logger = logging.getLogger(__name__)
MAX_PDF_BYTES = 15 * 1024 * 1024
PDF_MAGIC = b"%PDF-"
allowed_origins = [origin.strip() for origin in os.getenv("PO_LICE_ALLOWED_ORIGINS", "http://localhost:3000").split(",") if origin.strip()]

app = FastAPI(title="PO-LICE API", description="Deterministic procurement evidence and scenario modeling.", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)


@app.get("/", tags=["system"])
def read_root() -> dict[str, str]:
    return {"system": "PO-LICE API", "status": "online", "decision_model": "deterministic"}


@app.post("/api/v1/bids/upload", response_model=BidRecord, tags=["bids"])
async def upload_and_audit_bid(request: Request, file: UploadFile = File(...)) -> BidRecord:
    """Validate and analyse one PDF. Source text is extracted; patrols make the decision."""
    filename = file.filename or ""
    if Path(filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Upload a PDF document.")
    declared_size = file.size
    if declared_size is not None and declared_size > MAX_PDF_BYTES:
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
        extracted_bid = PDFExtractorService.extract_from_pdf_path(temp_path, submission_ip=submission_ip)
        scorecard = PatrolEngineService.run_all_patrols(extracted_bid)
        return bid_repository.save_bid(filename, contents, extracted_bid, scorecard)
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
    if not bid_repository.remove_bid(bid_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bid not found.")


@app.post("/api/v1/bids/{bid_id}/actions", response_model=ActivityEvent, tags=["bids"])
def record_reviewer_action(bid_id: str, request: ReviewerActionRequest) -> ActivityEvent:
    event = bid_repository.add_action(bid_id, request.action, request.note)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bid not found.")
    return event


@app.get("/api/v1/activity", response_model=list[ActivityEvent], tags=["activity"])
def list_activity(bid_id: str | None = None) -> list[ActivityEvent]:
    return bid_repository.activity(bid_id)


@app.post("/api/v1/bids/simulate", response_model=SimulationResponse, tags=["bids"])
def simulate_bid(request: SimulationRequest) -> SimulationResponse:
    """Recalculate the Dynamic Docket from bounded, deterministic inputs."""
    return PatrolEngineService.simulate(request)
