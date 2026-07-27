# PO-LICE

> Purchase Order Liability, Intelligence & Compliance Engine
>
> Team TensorTruss · Kaya AI IIT India Hackathon 2026 · Track 3: Procurement

[![CI](https://github.com/Aparna-Jha-05/kaya-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/Aparna-Jha-05/kaya-ai/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.11-009688)](https://fastapi.tiangolo.com/)
[![OpenSpec](https://img.shields.io/badge/specs-OpenSpec-blue)](openspec/changes)

PO-LICE is an evidence-first procurement review prototype. It accepts vendor
bid PDFs, extracts traceable facts, evaluates them with deterministic rules,
and presents the result as a reviewable procurement docket.

The core architecture rule is non-negotiable:

> **LLMs extract and explain. Deterministic code and stored rules decide.**

An AI model may propose a candidate fact only when it can cite supporting document text.
It cannot set engineering limits, calculate compliance outcomes, or change a
`PASS`, `FAIL`, `FLAG`, or officer decision. Missing or incompatible evidence becomes `FLAG`.

---

## 🚀 Quick Start & Competition Demo

### 1. Fast Demonstration Setup
```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Seed synthetic demo fixtures (idempotent)
PYTHONPATH=backend python3 scripts/seed_demo_data.py

# Start FastAPI backend
PYTHONPATH=backend uvicorn main:app --reload --port 8000 &

# Start Next.js frontend (in another terminal)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the Review Queue.

### 2. Run Verification & Acceptance Gate
```bash
# Run unit tests (19 assertion tests)
PYTHONPATH=backend python3 -m unittest discover -s backend/tests -v

# Run backend pipeline smoke test
PYTHONPATH=backend python3 scripts/test_pipeline.py

# Run deployed acceptance gate
python3 scripts/acceptance_gate.py --backend http://localhost:8000 --frontend http://localhost:3000
```

For the competition demo script, operator runbook, and visual checklist, see [docs/DEMO_RUNBOOK.md](docs/DEMO_RUNBOOK.md).

---

## 📊 Implemented Capabilities vs Planned Architecture

| Area | Status | Implementation Detail |
| --- | --- | --- |
| **Next.js Dashboard** | Implemented | Review queue, portfolio comparison, bid review workspace, audit log, TCO scenario slider |
| **FastAPI Backend** | Implemented | Upload, list, detail, source, delete, reviewer actions, RFI draft/approval, simulation, activity APIs |
| **PDF Extraction** | Implemented | PyMuPDF text parsing, unit normalization, page location, evidence bounding box geometry |
| **Model Cascade** | Implemented | Optional Ollama & Gemini adapters; disabled by default for guaranteed deterministic path |
| **Compliance Patrols** | Implemented | 4 deterministic Python patrols: Building Patrol, Green Patrol, Vice Squad, Traffic Control |
| **State Persistence** | Implemented | SQLite + local file storage with WAL mode, foreign keys, and optimistic concurrency (`expected_version`) |
| **Human Actions** | Implemented | Separate officer decision states (`UNDECIDED`, `AWARDED`, `REJECTED`, `RFI_PENDING`) & RFI approval |
| **Audit Log** | Implemented | Append-only activity trail with CSV export capability |
| **PostgreSQL Foundation** | Planned | SQL migrations, pgvector DDL, checksum tracking, synthetic seeder tested against disposable DB |
| **Production Auth & RLS** | Planned | Auth middleware and Supabase RLS policies specified |

> **Note on Demo Data**: All bid documents, vendor names, and company details in the demo dataset are **100% synthetic**. No real vendor documents or private data are used.

---

## 🛠️ Monorepo Routing

```text
backend/                       FastAPI boundary, SQLite repository, patrol engine
backend/AGENTS.md              Backend developer and agent guide
app/, components/, lib/        Next.js 14 frontend dashboard & typed API client
docs/DEMO_RUNBOOK.md           Operator runbook, timed demo script, & visual checklist
openspec/changes/              Proposed behavior and OpenSpec task definitions
scripts/seed_demo_data.py      Idempotent synthetic demo dataset generator
scripts/acceptance_gate.py     Acceptance gate script for pre-demo validation
scripts/test_pipeline.py       Backend pipeline smoke check runner
```
