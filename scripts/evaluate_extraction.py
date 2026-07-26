"""Generate labeled PDFs and measure the deterministic extraction baseline."""

from __future__ import annotations

import argparse
import json
import math
import os
import platform
import statistics
import sys
import tempfile
import time
from pathlib import Path

import fitz

os.environ["OLLAMA_ENABLED"] = "false"
os.environ["REMOTE_EXTRACTION_ENABLED"] = "false"

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.models.schemas import FactField  # noqa: E402
from app.services.extractor import PDFExtractorService  # noqa: E402
from app.services.model_extraction import unresolved_fields  # noqa: E402


def _value(record: object, path: str) -> object:
    current = record
    for part in path.split("."):
        current = getattr(current, part)
    return current


def _equal(actual: object, expected: object) -> bool:
    if isinstance(actual, (int, float)) and isinstance(expected, (int, float)):
        return math.isclose(float(actual), float(expected), rel_tol=1e-9, abs_tol=1e-9)
    return actual == expected


def _write_pdf(path: Path, text: str) -> None:
    document = fitz.open()
    try:
        page = document.new_page()
        remaining = page.insert_textbox(fitz.Rect(40, 40, 555, 800), text, fontsize=10)
        if remaining < 0:
            raise ValueError("evaluation fixture text does not fit on one page")
        document.save(path)
    finally:
        document.close()


def evaluate(cases_path: Path) -> dict:
    cases = json.loads(cases_path.read_text(encoding="utf-8"))
    expected_total = correct_total = 0
    unit_total = unit_correct = 0
    missing_checks = invented_missing = 0
    forbidden_checks = forbidden_hits = 0
    evidence_total = evidence_supported = 0
    disagreement_count = remote_requests = 0
    unresolved_total = 0
    latencies: list[float] = []
    case_results: list[dict] = []

    with tempfile.TemporaryDirectory(prefix="po-lice-evaluation-") as directory:
        fixture_dir = Path(directory)
        for case in cases:
            pdf_path = fixture_dir / f"{case['id']}.pdf"
            _write_pdf(pdf_path, case["text"])
            started = time.perf_counter()
            extracted = PDFExtractorService.extract_from_pdf_path(str(pdf_path), project_id="evaluation")
            latency_ms = (time.perf_counter() - started) * 1_000
            latencies.append(latency_ms)

            case_correct = 0
            for field_path, expected in case.get("expected", {}).items():
                expected_total += 1
                if _equal(_value(extracted, field_path), expected):
                    correct_total += 1
                    case_correct += 1

            for field_path, expected_unit in case.get("expected_units", {}).items():
                unit_total += 1
                candidate = extracted.extraction_report.selected.get(field_path)
                if candidate and candidate.unit == expected_unit:
                    unit_correct += 1

            for field_path in case.get("must_remain_missing", []):
                missing_checks += 1
                if _value(extracted, field_path) is not None:
                    invented_missing += 1

            selected_values = {
                candidate.normalized_value for candidate in extracted.extraction_report.selected.values()
            }
            for forbidden in case.get("forbidden_values", []):
                forbidden_checks += 1
                if forbidden in selected_values:
                    forbidden_hits += 1

            for candidate in extracted.extraction_report.selected.values():
                evidence_total += 1
                if candidate.source_excerpt and candidate.page is not None:
                    evidence_supported += 1

            disagreement_count += sum(
                issue.code == "MATERIAL_DISAGREEMENT" for issue in extracted.extraction_report.issues
            )
            remote_requests += len(extracted.extraction_report.remote_disclosures)
            unresolved_total += len(unresolved_fields(extracted))
            case_results.append(
                {
                    "id": case["id"],
                    "expected_fields_correct": case_correct,
                    "expected_fields_total": len(case.get("expected", {})),
                    "unresolved_fields": [field.value for field in unresolved_fields(extracted)],
                    "latency_ms": round(latency_ms, 3),
                }
            )

    invention_denominator = missing_checks + forbidden_checks
    return {
        "configuration": "deterministic-only",
        "hardware": {
            "platform": platform.platform(),
            "machine": platform.machine(),
            "python": platform.python_version(),
        },
        "request_deadline_seconds": float(os.getenv("ML_EXTRACTION_DEADLINE_SECONDS", "20")),
        "cases": case_results,
        "metrics": {
            "field_accuracy": correct_total / expected_total if expected_total else 1.0,
            "unit_accuracy": unit_correct / unit_total if unit_total else 1.0,
            "unsupported_value_invention_rate": (
                (invented_missing + forbidden_hits) / invention_denominator if invention_denominator else 0.0
            ),
            "evidence_support_rate": evidence_supported / evidence_total if evidence_total else 1.0,
            "unresolved_field_count": unresolved_total,
            "disagreement_count": disagreement_count,
            "remote_request_count": remote_requests,
            "estimated_remote_cost_usd": 0.0,
            "latency_ms_median": round(statistics.median(latencies), 3),
            "latency_ms_max": round(max(latencies), 3),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases", type=Path, default=ROOT / "scripts" / "evaluation_cases.json")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--assert-baseline", action="store_true")
    args = parser.parse_args()
    report = evaluate(args.cases)
    rendered = json.dumps(report, indent=2)
    print(rendered)
    if args.output:
        args.output.write_text(rendered + "\n", encoding="utf-8")
    if args.assert_baseline:
        metrics = report["metrics"]
        assert metrics["field_accuracy"] == 1.0
        assert metrics["unit_accuracy"] == 1.0
        assert metrics["unsupported_value_invention_rate"] == 0.0
        assert metrics["evidence_support_rate"] == 1.0
        assert metrics["remote_request_count"] == 0


if __name__ == "__main__":
    main()
