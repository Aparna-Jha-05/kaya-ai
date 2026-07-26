# AGENTS.md — PO-lice Developer and Agent Guide

> **Project**: PO-lice (Purchase Order Liability, Intelligence & Compliance Engine)
> **Hackathon**: Kaya AI IIT India Hackathon 2026 — Track 3: Procurement  
> **Repository**: `git@github.com:Aparna-Jha-05/kaya-ai.git`

## Non-negotiable architecture rule

> **LLM / VLM extracts and explains; deterministic SQL and math validate.**

- Generative models may extract candidate facts or improve wording. They must never set engineering limits, calculate compliance outcomes, or change `PASS` / `FAIL` / `FLAG`.
- Missing or uncertain evidence is `FLAG`, never an inferred value or silent `PASS`.
- Every decision must be reproducible from stored evidence, units, rule inputs, constraint version, and engine version.
- Human approval, rejection, correction, and dispatch are separate, audited actions.

## Source-of-truth order

Use this order when documents disagree:

1. Executed code and assertion-based tests describe current behavior.
2. Accepted OpenSpec artifacts describe intended behavior.
3. `README.md` describes the demo and setup.
4. `docs/PO-LICE.pdf` is the original concept document. It contains aspirational architecture and must not be used as proof that a feature is wired.

The active backend proposals are:

- `openspec/changes/robust-supabase-backend/`
- `openspec/changes/multi-provider-pdf-extraction/`

Validate it with:

```bash
openspec list --json
openspec validate robust-supabase-backend --strict
openspec validate multi-provider-pdf-extraction --strict
```

Do not mark an OpenSpec task complete from static inspection alone.

## Current backend reality

As of the current checkout:

- FastAPI exposes upload, simulation, bid list/detail/source/delete, reviewer action, and activity endpoints.
- Uploaded bid records and source PDFs use local SQLite/filesystem persistence.
- PDF extraction is PyMuPDF plus conservative regex parsing, followed by optional Ollama/Gemini extraction that is disabled by default.
- Patrol decisions use in-process Python rules and hard-coded `ConstraintGraph` values.
- duplicate/integrity correlation is process-local memory and resets on restart.
- the dashboard uses `lib/api.ts` for the implemented bid workflow.
- Supabase persistence, authentication, RLS, RFI persistence/dispatch, site-constraint updates, and durable multi-project audit storage are planned, not implemented.

Never describe the current prototype as having MinIO storage, live RAG, database-backed patrols, immutable audit storage, VLM CAD extraction, Jarvis dispatch, or Kaya/Amber integration unless runtime evidence is added.

## Repository routing

```text
backend/                       FastAPI boundary and deterministic engine
backend/AGENTS.md              Backend-specific contracts and guardrails
app/, components/, lib/        Next.js dashboard and current mock client state
openspec/changes/              Proposed behavior and implementation tasks
.github/workflows/ci.yml       Required cross-stack pull-request checks
render.yaml                    Backend staging deployment after CI checks pass
scripts/test_pipeline.py       Smoke/demo runner; currently prints rather than asserts
scripts/evaluate_extraction.py Labeled deterministic/model extraction evaluation
docs/PO-LICE.pdf               Concept document, not implementation evidence
```

Read the nearest `AGENTS.md` before changing files in a subdirectory.

## Working rules

- Inspect callers and frontend consumers before changing a schema or endpoint.
- Prefer one canonical model per API concept; do not maintain independent Python and TypeScript decision logic after API wiring.
- Keep database access behind a small repository/service boundary. Patrol math should remain testable without HTTP.
- Reuse the existing Pydantic models and services before adding abstractions or dependencies.
- Preserve user changes in this dirty worktree. Do not commit ignored `docs/`, local agent configuration, caches, `.env` files, generated PDFs, or fixture output unless explicitly requested.
- Never put credentials, vendor documents, bid contents, personal data, or secrets in logs, fixtures, audit evidence, prompts, or commits.

## Verification

Baseline commands:

```bash
python3 scripts/seed_demo_data.py
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=backend python3 scripts/test_pipeline.py
npm run build
```

The pipeline script is only a smoke check until it contains assertions. For backend changes, add the smallest runnable assertion-based test covering the changed rule or contract. Report separately:

- static validation,
- smoke execution,
- assertion-based tests,
- database/integration evidence,
- frontend end-to-end evidence.

## Team ownership

- **Jb Anmol**: full-stack, extraction, and monorepo orchestration.
- **Pratham Amritkar**: RAG and AI systems.
- **Aparna Jha**: domain specifications and QA.
