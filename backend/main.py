"""
PO-lice FastAPI Gateway Entrypoint
Amber's Procurement Enforcement Layer API
"""

import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.services.extractor import PDFExtractorService
from app.services.patrols import PatrolEngineService
from app.models.schemas import DocketScorecard

app = FastAPI(
    title="PO-lice API Gateway",
    description="Amber Procurement Enforcement & Hard-Gate Validation Engine",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "system": "PO-lice API Gateway",
        "status": "ONLINE",
        "version": "1.0.0",
        "track": "Track 3 - Procurement (Kaya AI IIT India Hackathon 2026)"
    }

@app.post("/api/v1/bids/upload", response_model=DocketScorecard)
async def upload_and_audit_bid(file: UploadFile = File(...)):
    """
    Accepts PDF upload, runs PyMuPDF extraction, executes the 4 Patrols,
    and returns a complete DocketScorecard with 5-Year TCO² math.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Save temporary file
    temp_path = f"/tmp/{file.filename}"
    try:
        contents = await file.read()
        with open(temp_path, "wb") as f:
            f.write(contents)

        # 1. Extract specs from PDF
        extracted_bid = PDFExtractorService.extract_from_pdf_path(temp_path)

        # 2. Run 4 Patrols & calculate TCO²
        scorecard = PatrolEngineService.run_all_patrols(extracted_bid)

        return scorecard
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/api/v1/agent/rfi-draft")
def draft_rfi_counter_spec(vendor_name: str, breach_reason: str):
    """
    Generates a formal counter-specification RFI email draft for rejected bids.
    """
    return {
        "status": "DRAFTED",
        "recipient": vendor_name,
        "subject": f"RFI Counter-Spec Required for {vendor_name}",
        "body": f"Dear {vendor_name},\n\nYour submitted bid failed PO-lice hard-gate evaluation due to: {breach_reason}.\n\nPlease submit an alternative spec bid by July 28 to avoid disqualification."
    }
