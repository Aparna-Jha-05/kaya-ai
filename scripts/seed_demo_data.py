#!/usr/bin/env python3
"""PO-LICE Competition Demo Dataset — Idempotent Fixture Generator.

Creates three stable, visibly synthetic bid fixtures and one upload-ready PDF.
Re-running never creates duplicates (uses idempotency keys).

Fixtures:
  1. Trane    → RECOMMENDED   (₹4.20 Cr, all patrols PASS)
  2. Carrier  → REVIEW_REQUIRED (₹4.50 Cr, missing width/warranty → FLAG)
  3. CoolTech → REJECT        (₹3.80 Cr — lowest price — hard constraint failures)

The rejected bid is deliberately the cheapest to illustrate that cost alone
does not determine compliance.

All content is visibly synthetic. No real vendor data is used.
"""

import os
import sys

# Ensure backend is on the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import fitz  # PyMuPDF — only for PDF generation

from app.services.extractor import PDFExtractorService
from app.services.patrols import PatrolEngineService
from app.services.repository import bid_repository

# ── Stable idempotency keys ────────────────────────────────────────────
FIXTURES = {
    "DEMO-SEED-TRANE-COMPLIANT": {
        "filename": "SyntheticBid_Trane_Compliant.pdf",
        "expected_recommendation": "RECOMMENDED",
        "expected_vendor": "Trane Solutions Pvt Ltd.",
    },
    "DEMO-SEED-CARRIER-REVIEW": {
        "filename": "SyntheticBid_Carrier_Review.pdf",
        "expected_recommendation": "REVIEW_REQUIRED",
        "expected_vendor": "Carrier HVAC India Ltd.",
    },
    "DEMO-SEED-COOLTECH-REJECT": {
        "filename": "SyntheticBid_CoolTech_Reject.pdf",
        "expected_recommendation": "REJECT",
        "expected_vendor": "CoolTech Global Solutions Pvt Ltd.",
    },
}

PROJECT_ID = os.getenv("PO_LICE_PROJECT_ID", "PRJ-POLICE-01")
DEMO_ACTOR = "DEMO_SEEDER"


def _scorecard_has_current_schedule_evidence(scorecard) -> bool:
    traffic = next(
        (result for result in scorecard.patrol_results if result.patrol_name == "TRAFFIC_CONTROL"),
        None,
    )
    evidence = traffic.evidence if traffic else None
    return bool(
        evidence
        and "promised_delivery_weeks" in evidence
        and "maximum_delivery_weeks" in evidence
    )


def _generate_pdfs() -> dict[str, bytes]:
    """Return {filename: bytes} for the three narrative fixtures."""
    pdfs: dict[str, bytes] = {}

    # 1. Trane — Compliant (RECOMMENDED)
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), """\
[SYNTHETIC DEMO DATA — NOT A REAL VENDOR BID]

TRANE SOLUTIONS — COMMERCIAL PROPOSAL
PROJECT: IIT Smart Campus Phase 1 Data Center
VENDOR: Trane Solutions Pvt Ltd.
Upfront Bid Amount: INR 4,20,00,000 (INR 4.20 Crore)
Promised Delivery: 10 Weeks
OSHA Form 300 Certified: Yes
Warranty: 7 Years

TECHNICAL SPECIFICATIONS:
--------------------------------------------------
1. Equipment Model: TR-1100 (Standard Centrifugal Chiller)
2. Cooling Capacity: 1,200 kW
3. Substation Power Draw: 1,100 kW
4. Equipment Width: 1.8 m
5. Embodied Carbon Factor: 380 kgCO2e/ton
""", fontsize=11)
    pdfs["SyntheticBid_Trane_Compliant.pdf"] = doc.tobytes()
    doc.close()

    # 2. Carrier — Review Required (missing width + warranty)
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), """\
[SYNTHETIC DEMO DATA — NOT A REAL VENDOR BID]

CARRIER HVAC — COMMERCIAL PROPOSAL
PROJECT: IIT Smart Campus Phase 1 Data Center
VENDOR: Carrier HVAC India Ltd.
Upfront Bid Amount: INR 4,50,00,000 (INR 4.50 Crore)
Promised Delivery: 8 Weeks
OSHA Form 300 Certified: Yes

TECHNICAL SPECIFICATIONS:
--------------------------------------------------
1. Equipment Model: CR-1180
2. Cooling Capacity: 1,250 kW
3. Substation Power Draw: 1,180 kW
4. Embodied Carbon Factor: 410 kgCO2e/ton
""", fontsize=11)
    pdfs["SyntheticBid_Carrier_Review.pdf"] = doc.tobytes()
    doc.close()

    # 3. CoolTech — Rejected, cheapest (hard constraint failures)
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), """\
[SYNTHETIC DEMO DATA — NOT A REAL VENDOR BID]

COOLTECH GLOBAL — COMMERCIAL PROPOSAL
TECHNICAL & COMMERCIAL BID (DISCOUNTED BID)
PROJECT: IIT Smart Campus Phase 1 Data Center
VENDOR: CoolTech Global Solutions Pvt Ltd.
EQUIPMENT BID: Substituted Modular Chiller Model CTX-1400

TECHNICAL SPECIFICATIONS:
--------------------------------------------------
1. Equipment Model: CTX-1400 (Substituted Equivalent)
2. Cooling Capacity: 1,400 kW
3. Substation Power Draw: 1,400 kW
4. Equipment Width: 2.1 m
5. Embodied Carbon Factor: 540 kgCO2e/ton

COMMERCIAL & SLA TERMS:
--------------------------------------------------
- Upfront Capex Price: INR 3,80,00,000 (INR 3.80 Crore) — LOWEST PRICE
- Promised Delivery SLA: 4 Weeks
- Warranty: 2 Years Standard
- NOTE: OSHA Safety Form 300 is currently PENDING / MISSING.
""", fontsize=11)
    pdfs["SyntheticBid_CoolTech_Reject.pdf"] = doc.tobytes()
    doc.close()

    return pdfs


def _generate_upload_pdf() -> bytes:
    """Create a fourth synthetic PDF used for the live-upload demonstration."""
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), """\
[SYNTHETIC DEMO DATA — NOT A REAL VENDOR BID]

ACME HVAC — COMMERCIAL PROPOSAL
PROJECT: IIT Smart Campus Phase 1 Data Center
VENDOR: Acme HVAC Demo Corp
Upfront Bid Amount: INR 4,00,00,000 (INR 4.00 Crore)
Promised Delivery: 11 Weeks
OSHA Form 300 Certified: Yes

TECHNICAL SPECIFICATIONS:
--------------------------------------------------
1. Equipment Model: ACME-900
2. Cooling Capacity: 1,100 kW
3. Substation Power Draw: 1,050 kW
4. Equipment Width: 1.7 m
5. Embodied Carbon Factor: 420 kgCO2e/ton
6. Warranty: 6 Years
""", fontsize=11)
    content = doc.tobytes()
    doc.close()
    return content


def seed(*, verbose: bool = True) -> list[dict]:
    """Seed the three narrative fixtures. Returns list of {key, id, recommendation, vendor}."""
    pdf_bytes = _generate_pdfs()
    results: list[dict] = []

    for key, fixture in FIXTURES.items():
        filename = fixture["filename"]
        expected_rec = fixture["expected_recommendation"]
        expected_vendor = fixture["expected_vendor"]

        # Check idempotency first
        existing = bid_repository.get_bid_by_idempotency(
            PROJECT_ID, DEMO_ACTOR, key,
        )
        if existing and not _scorecard_has_current_schedule_evidence(existing.scorecard):
            bid_repository.remove_bid(
                existing.id,
                project_id=PROJECT_ID,
                uploader_identity=DEMO_ACTOR,
                idempotency_key=key,
            )
            existing = None
        if existing:
            actual_rec = existing.scorecard.recommendation
            if verbose:
                print(f"  ✓ {key}: already exists (id={existing.id}, rec={actual_rec})")
            results.append({
                "key": key, "id": existing.id,
                "recommendation": actual_rec,
                "vendor": existing.source.vendor_name,
                "created": False,
            })
            continue

        contents = pdf_bytes[filename]
        import tempfile, os as _os
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        try:
            source = PDFExtractorService.extract_from_pdf_path(
                tmp_path, project_id=PROJECT_ID,
            )
        finally:
            _os.unlink(tmp_path)

        scorecard = PatrolEngineService.run_all_patrols(source)
        record = bid_repository.save_bid(
            filename, contents, source, scorecard,
            project_id=PROJECT_ID,
            uploader_identity=DEMO_ACTOR,
            idempotency_key=key,
        )

        if verbose:
            print(f"  ✓ {key}: created (id={record.id}, rec={record.scorecard.recommendation})")

        results.append({
            "key": key, "id": record.id,
            "recommendation": record.scorecard.recommendation,
            "vendor": record.source.vendor_name,
            "created": True,
        })

    return results


def generate_upload_fixture(*, verbose: bool = True) -> str:
    """Write the live-upload demo PDF to scripts/fixtures/. Returns path."""
    fixture_dir = os.path.join(os.path.dirname(__file__), "fixtures")
    os.makedirs(fixture_dir, exist_ok=True)
    path = os.path.join(fixture_dir, "DemoUpload_SyntheticBid.pdf")
    pdf_bytes = _generate_upload_pdf()
    with open(path, "wb") as f:
        f.write(pdf_bytes)
    if verbose:
        print(f"  ✓ Live-upload PDF written to {path}")
    return path


def verify(results: list[dict]) -> bool:
    """Verify fixture invariants. Returns True if all pass."""
    ok = True

    # Check all three exist
    if len(results) != 3:
        print(f"  ✗ Expected 3 fixtures, got {len(results)}")
        ok = False

    # Check unique IDs
    ids = [r["id"] for r in results]
    if len(set(ids)) != 3:
        print(f"  ✗ Fixture IDs are not unique: {ids}")
        ok = False

    # Check expected recommendations
    for result in results:
        expected = FIXTURES[result["key"]]["expected_recommendation"]
        actual = result["recommendation"]
        expected_vendor = FIXTURES[result["key"]]["expected_vendor"]
        actual_vendor = result["vendor"]
        if actual != expected:
            print(f"  ✗ {result['key']}: expected {expected}, got {actual}")
            ok = False
        if expected_vendor not in actual_vendor:
            print(f"  ✗ {result['key']}: vendor mismatch: expected '{expected_vendor}', got '{actual_vendor}'")
            ok = False

    # Check rejected bid is lowest price
    reject = next((r for r in results if r["recommendation"] == "REJECT"), None)
    if reject:
        reject_bid = bid_repository.get_bid(reject["id"])
        other_bids = [bid_repository.get_bid(r["id"]) for r in results if r["id"] != reject["id"]]
        if reject_bid and all(other_bids):
            reject_price = reject_bid.source.bid_amount_inr or float("inf")
            for other in other_bids:
                other_price = other.source.bid_amount_inr or 0
                if reject_price >= other_price:
                    print(f"  ✗ Rejected bid (₹{reject_price:,.0f}) is not the lowest-price (other: ₹{other_price:,.0f})")
                    ok = False
                    break

    if ok:
        print("  ✓ All fixture invariants verified")
    return ok


if __name__ == "__main__":
    print("=" * 60)
    print("🚀 PO-lice Competition Demo — Fixture Seeder")
    print("=" * 60)
    print()

    print("Seeding narrative fixtures:")
    results = seed()

    print()
    print("Generating live-upload fixture:")
    generate_upload_fixture()

    print()
    print("Verifying fixture invariants:")
    ok = verify(results)

    print()
    if ok:
        print("✨ Demo fixtures are ready.")
    else:
        print("❌ Fixture verification FAILED.")
        sys.exit(1)
