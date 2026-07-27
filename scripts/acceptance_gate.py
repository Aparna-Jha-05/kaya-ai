#!/usr/bin/env python3
"""PO-LICE Competition Deployed Acceptance Gate.

Parameterized acceptance script that validates public/deployed or local
frontend and backend endpoints without requiring third-party dependencies.

Usage:
  python3 scripts/acceptance_gate.py [--backend URL] [--frontend URL]

Defaults:
  --backend  http://localhost:8000
  --frontend http://localhost:3000
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


def _lower_headers(headers: dict) -> dict[str, str]:
    return {str(k).lower(): str(v) for k, v in headers.items()}


def http_get(url: str, headers: dict | None = None) -> tuple[int, dict | str, dict[str, str]]:
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            resp_headers = _lower_headers(dict(resp.headers))
            body_bytes = resp.read()
            try:
                data = json.loads(body_bytes.decode("utf-8"))
            except Exception:
                data = body_bytes.decode("utf-8", errors="replace")
            return status, data, resp_headers
    except urllib.error.HTTPError as err:
        body_bytes = err.read()
        try:
            data = json.loads(body_bytes.decode("utf-8"))
        except Exception:
            data = body_bytes.decode("utf-8", errors="replace")
        return err.code, data, _lower_headers(dict(err.headers))


def http_post_json(url: str, payload: dict, headers: dict | None = None) -> tuple[int, dict | str, dict[str, str]]:
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data_bytes, headers=req_headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            try:
                return resp.status, json.loads(body), _lower_headers(dict(resp.headers))
            except Exception:
                return resp.status, body, _lower_headers(dict(resp.headers))
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8", errors="replace")
        try:
            return err.code, json.loads(body), _lower_headers(dict(err.headers))
        except Exception:
            return err.code, body, _lower_headers(dict(err.headers))


def http_patch_json(url: str, payload: dict, headers: dict | None = None) -> tuple[int, dict | str, dict[str, str]]:
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data_bytes, headers=req_headers, method="PATCH")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            try:
                return resp.status, json.loads(body), _lower_headers(dict(resp.headers))
            except Exception:
                return resp.status, body, _lower_headers(dict(resp.headers))
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8", errors="replace")
        try:
            return err.code, json.loads(body), _lower_headers(dict(err.headers))
        except Exception:
            return err.code, body, _lower_headers(dict(err.headers))


def http_upload_file(url: str, filename: str, file_bytes: bytes, headers: dict | None = None) -> tuple[int, dict | str, dict[str, str]]:
    boundary = "----POLiceAcceptanceBoundary12345"
    body_parts = []
    body_parts.append(f"--{boundary}".encode("utf-8"))
    body_parts.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"'.encode("utf-8"))
    body_parts.append(b"Content-Type: application/pdf")
    body_parts.append(b"")
    body_parts.append(file_bytes)
    body_parts.append(f"--{boundary}--".encode("utf-8"))
    body_parts.append(b"")

    body_data = b"\r\n".join(body_parts)

    req_headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Content-Length": str(len(body_data)),
    }
    if headers:
        req_headers.update(headers)

    req = urllib.request.Request(url, data=body_data, headers=req_headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            res_text = resp.read().decode("utf-8", errors="replace")
            try:
                return resp.status, json.loads(res_text), _lower_headers(dict(resp.headers))
            except Exception:
                return resp.status, res_text, _lower_headers(dict(resp.headers))
    except urllib.error.HTTPError as err:
        res_text = err.read().decode("utf-8", errors="replace")
        try:
            return err.code, json.loads(res_text), _lower_headers(dict(err.headers))
        except Exception:
            return err.code, res_text, _lower_headers(dict(err.headers))


def run_acceptance_gate(backend_url: str, frontend_url: str) -> bool:
    print("=" * 60)
    print("🛡️  PO-LICE Competition Deployed Acceptance Gate")
    print("=" * 60)
    print(f"  Target Backend:  {backend_url}")
    print(f"  Target Frontend: {frontend_url}")
    print()

    passed = 0
    total = 0

    def check(name: str, fn) -> bool:
        nonlocal passed, total
        total += 1
        print(f"[{total}] Checking: {name}...", end=" ", flush=True)
        try:
            fn()
            print("✓ PASS")
            passed += 1
            return True
        except AssertionError as err:
            print(f"❌ FAIL: {err}")
            return False
        except Exception as err:
            print(f"❌ ERROR: {err}")
            return False

    # 1. Frontend reachability
    def test_frontend():
        status, data, _ = http_get(frontend_url)
        assert status == 200, f"Frontend returned HTTP {status}"
        assert isinstance(data, str) and ("<html" in data.lower() or "<!doctype" in data.lower() or "po-lice" in data.lower() or "bid" in data.lower()), "Frontend HTML body invalid"
    check("Public Frontend reachability", test_frontend)

    # 2. Backend readiness
    def test_readiness():
        status, data, _ = http_get(f"{backend_url}/api/v1/readiness")
        assert status == 200, f"Readiness returned HTTP {status}"
        assert isinstance(data, dict), "Readiness response not JSON"
        assert data.get("status") in ("healthy", "ok"), f"Unhealthy readiness: {data}"
    check("Backend readiness", test_readiness)

    # 3. CORS origin headers check
    def test_cors():
        status, _, headers = http_get(
            f"{backend_url}/api/v1/bids",
            headers={"Origin": frontend_url},
        )
        assert status == 200, f"CORS test GET returned HTTP {status}"
        allow_origin = headers.get("access-control-allow-origin", "")
        assert allow_origin in (frontend_url, "*"), f"CORS allow-origin header invalid: '{allow_origin}'"
    check("Exact-Origin CORS policy", test_cors)

    # 4. Seeded narrative fixtures exist
    def test_seeded_fixtures():
        status, data, _ = http_get(f"{backend_url}/api/v1/bids")
        assert status == 200, f"GET /api/v1/bids returned {status}"
        assert isinstance(data, list), "Bids endpoint did not return an array"

        recommendations = {b.get("scorecard", {}).get("recommendation") for b in data if isinstance(b, dict)}
        assert "RECOMMENDED" in recommendations, f"Missing RECOMMENDED fixture (found: {recommendations})"
        assert "REVIEW_REQUIRED" in recommendations, f"Missing REVIEW_REQUIRED fixture (found: {recommendations})"
        assert "REJECT" in recommendations, f"Missing REJECT fixture (found: {recommendations})"
    check("Three seeded narrative outcomes exist", test_seeded_fixtures)

    # 5. Synthetic PDF upload & idempotency
    uploaded_bid_id = None
    def test_upload():
        nonlocal uploaded_bid_id
        from scripts.seed_demo_data import generate_upload_fixture
        pdf_path = generate_upload_fixture(verbose=False)
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        key = "GATE-ACCEPTANCE-UPLOAD-01"
        status, data, _ = http_upload_file(
            f"{backend_url}/api/v1/bids/upload",
            "DemoUpload_SyntheticBid.pdf",
            pdf_bytes,
            headers={"Idempotency-Key": key},
        )
        assert status == 200, f"Upload returned {status}: {data}"
        assert isinstance(data, dict), "Upload output not JSON"
        uploaded_bid_id = data.get("id")
        assert uploaded_bid_id, "Uploaded bid ID missing"
        assert data.get("source", {}).get("vendor_name"), "Vendor name missing in upload"

        # Test idempotency (replay)
        status2, data2, _ = http_upload_file(
            f"{backend_url}/api/v1/bids/upload",
            "DemoUpload_SyntheticBid.pdf",
            pdf_bytes,
            headers={"Idempotency-Key": key},
        )
        assert status2 == 200, f"Replay upload returned {status2}"
        assert data2.get("id") == uploaded_bid_id, "Idempotent upload returned different ID"
    check("Synthetic PDF upload & idempotency", test_upload)

    # 6. Source PDF retrieval
    def test_source():
        assert uploaded_bid_id, "No uploaded bid ID"
        status, data, headers = http_get(f"{backend_url}/api/v1/bids/{uploaded_bid_id}/source")
        assert status == 200, f"Source retrieval returned {status}"
        assert "application/pdf" in headers.get("content-type", "").lower(), f"Source Content-Type invalid: {headers}"
    check("Source PDF retrieval", test_source)

    # 7. Simulation API
    def test_simulation():
        payload = {"base_capex_inr": 40_000_000, "discount_percent": 5, "delay_days": 10}
        status, data, _ = http_post_json(f"{backend_url}/api/v1/bids/simulate", payload)
        assert status == 200, f"Simulate returned {status}: {data}"
        assert isinstance(data, dict) and "calculated_tco2_inr" in data, "Simulation schema invalid"
    check("TCO Scenario Simulation API", test_simulation)

    # 8. RFI Draft & Approval Workflow
    approved_rfi_id = None
    def test_rfi_workflow():
        nonlocal approved_rfi_id
        assert uploaded_bid_id, "No uploaded bid ID"
        # 1. Draft
        status, data, _ = http_post_json(f"{backend_url}/api/v1/agent/rfi-draft", {"bid_id": uploaded_bid_id})
        assert status == 200, f"RFI draft returned {status}: {data}"
        assert isinstance(data, dict) and data.get("rfi_id"), "RFI draft missing ID"
        rfi_id = data["rfi_id"]
        rfi_text = data.get("rfi_text", "")

        # 2. Approve
        status, data2, _ = http_patch_json(
            f"{backend_url}/api/v1/rfis/{rfi_id}/approve",
            {"edited_text": rfi_text, "note": "Acceptance test approval"},
        )
        assert status == 200, f"RFI approve returned {status}: {data2}"
        assert data2.get("status") == "APPROVED", f"RFI status not APPROVED: {data2}"
        approved_rfi_id = rfi_id
    check("RFI draft generation & human approval", test_rfi_workflow)

    # 9. Reviewer action
    def test_action():
        assert uploaded_bid_id, "No uploaded bid ID"
        payload = {"action": "REVIEWED_READY_FOR_DECISION", "note": "Acceptance test reviewer action"}
        status, data, _ = http_post_json(f"{backend_url}/api/v1/bids/{uploaded_bid_id}/actions", payload)
        assert status == 200, f"Reviewer action returned {status}: {data}"
        assert isinstance(data, dict) and data.get("bid_id") == uploaded_bid_id, "Action event schema invalid"
    check("Reviewer action recording", test_action)

    # 10. Activity log retrieval
    def test_activity():
        assert uploaded_bid_id, "No uploaded bid ID"
        status, data, _ = http_get(f"{backend_url}/api/v1/activity?bid_id={uploaded_bid_id}")
        assert status == 200, f"Activity log returned {status}"
        assert isinstance(data, list) and len(data) >= 1, "Activity log empty or invalid"
    check("Activity log retrieval", test_activity)

    print()
    print("-" * 60)
    print(f"Gate Summary: {passed}/{total} checks passed.")
    print("-" * 60)

    if passed == total:
        print("✨ DEPLOYED ACCEPTANCE GATE PASSED SUCCESSFULLY!")
        return True
    else:
        print("❌ DEPLOYED ACCEPTANCE GATE FAILED.")
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PO-LICE Competition Deployed Acceptance Gate")
    parser.add_argument("--backend", default=os.getenv("PO_LICE_BACKEND_URL", "http://localhost:8000"), help="Backend URL")
    parser.add_argument("--frontend", default=os.getenv("PO_LICE_FRONTEND_URL", "http://localhost:3000"), help="Frontend URL")
    args = parser.parse_args()

    success = run_acceptance_gate(args.backend, args.frontend)
    if not success:
        sys.exit(1)
