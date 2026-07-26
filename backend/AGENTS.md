# Backend Agent Guide

This file applies to `backend/` and backend-facing scripts or OpenSpec work.

## Mission

Turn vendor documents into reviewable evidence and deterministic procurement decisions. The backend must support every frontend action without allowing the frontend, an LLM, or an unverified extraction to create a compliance fact.

## Current flow

```text
multipart PDF
  -> FastAPI size/signature checks
  -> temporary file
  -> PyMuPDF text + metadata extraction
  -> optional local-first model extraction for unresolved fields
  -> strict Pydantic `VendorBidExtract`
  -> four in-process patrols
  -> local SQLite/filesystem record
  -> `BidRecord` response
```

Current entry points:

- `backend/main.py`: upload and simulation HTTP endpoints.
- `backend/app/models/schemas.py`: strict boundary models.
- `backend/app/services/extractor.py`: PDF parsing and candidate extraction.
- `backend/app/services/model_extraction.py`: disabled-by-default Ollama/Gemini candidate extraction and validation.
- `backend/app/services/patrols.py`: deterministic patrol and TCO logic.
- `backend/app/services/integrity.py`: prototype-only in-memory correlations.
- `backend/app/services/repository.py`: local SQLite/source-PDF persistence,
  optimistic officer decisions, versioned constraints, and persisted RFI drafts.

The SQLite prototype slice described by
`openspec/changes/robust-supabase-backend/` is partially implemented.
Supabase CRUD, authentication/RLS, project isolation, pgvector retrieval,
immutable reassessment versions, and staging deployment are not implemented.
The provider cascade is implemented behind configuration, but provider model
selection and staging evaluation remain incomplete until measured evidence is
recorded.

## Required boundaries

### Extraction

- Store a candidate value only with `field`, canonical value, canonical unit, source method, page, page dimensions/rotation, bounding box, supporting text hash or excerpt, and confidence/review state.
- Define the PDF coordinate system explicitly. A rectangle without page size and rotation is not a stable frontend contract.
- PyMuPDF rectangles are location evidence, not confidence scores. Confidence must come from a documented parser/OCR rule and include a reason.
- Text PDFs, scanned PDFs, tables, and CAD drawings are distinct extraction paths. Do not label text-block coordinates as CAD geometry.
- Preserve raw extraction and human corrections as versions. Never overwrite the original evidence.
- Normalize units before patrol evaluation and retain the source value/unit for replay.

### Deterministic patrols

- Patrol inputs are validated, canonical facts plus a versioned constraint snapshot.
- Any required missing or unconfirmed input produces `FLAG`.
- Every result stores `rule_id`, rule/engine version, input facts, limits, units, calculated delta, status, and evidence references.
- Use `Decimal` / PostgreSQL `NUMERIC` for money and configured rounding rules. Do not use binary floating point for persisted financial decisions.
- LLM/RAG summaries may explain retrieved records. Only structured, cited facts may affect a risk score.
- If vector search, constraints, or another required dependency is unavailable, return an explicit unavailable/review state. Never substitute a different algorithm silently.

### State model

Keep these independent:

1. **Processing**: `UPLOADED`, `EXTRACTING`, `NEEDS_REVIEW`, `AUDITING`, `COMPLETE`, `FAILED`.
2. **Compliance recommendation**: `RECOMMENDED`, `REVIEW_REQUIRED`, `REJECT`.
3. **Officer decision**: `UNDECIDED`, `AWARDED`, `REJECTED`, `RFI_PENDING`.
4. **Procurement lifecycle**: `PRE_AWARD`, `POST_AWARD`.

Do not reuse one `status` column for all four concepts.

### Persistence and transactions

- Every project-owned row carries `project_id`; every query is project-scoped.
- Persist raw documents in private object storage and metadata/results in PostgreSQL.
- A successful upload response must not claim persistence if any required write failed.
- Use idempotency for retries. Define duplicate-document behavior separately from request replay behavior.
- A patrol run is immutable. Re-audit creates a new run referencing the prior run, extraction version, constraint version, and reason.
- Constraint updates use optimistic concurrency and create a new version; they do not overwrite the evidence used by past decisions.
- Audit rows are append-only to the application role. Record actor identity from verified auth context, not request JSON.
- An in-memory fallback may be used only in an explicit demo mode and must be visible in the response/health status. Production write paths fail closed.

### Authentication and authorization

- Authenticate every non-health endpoint before accepting files or returning bid data.
- Required roles should be explicit: procurement officer, engineer, sustainability lead, and administrator.
- Enforce project membership and action permissions in the API and database policy/role design.
- A service credential or direct database role can bypass Supabase RLS; do not claim RLS protection unless the runtime identity and policies are verified.
- Never expose database credentials or service keys to Next.js client components.

### Upload safety

- Enforce request size at the reverse proxy and application.
- Check allowed extension, declared content type, file signature, parser success, page count, and processing time/resource limits.
- Generate storage names server-side; never trust the client filename as a path.
- Keep uploads private, scan/quarantine before downstream processing when available, and never execute embedded content.
- Log identifiers and outcomes, not document contents, bank accounts, contact details, or extracted clauses.

## Frontend contract checklist

Before implementing an endpoint, define:

- auth role and project scope,
- request/response model and enum values,
- stable IDs and timestamps,
- pagination/filter/sort for collections,
- empty/loading/partial/failure behavior,
- idempotency and concurrency behavior,
- error envelope with a request/trace ID,
- audit event,
- OpenAPI example,
- one frontend consumer or contract test.

The intended API must cover:

- bid upload plus processing state,
- bid list and detail,
- extracted fields and evidence regions,
- reviewer confirmation/correction of low-confidence fields,
- immutable patrol runs and re-audit,
- TCO scenario simulation with server-owned rates/limits,
- officer status transitions,
- RFI draft, edit/save, approve, queue/cancel, and delivery status,
- supplier list/detail and verified location provenance,
- site-constraint read/version/update,
- paginated audit retrieval/export.

Do not add a backend endpoint for the static project-plan page unless it becomes real server-owned data.

## RFI safety

- Drafting, editing, approval, queueing, sending, and delivery are separate states and audit events.
- Generate deterministic factual sections from stored breaches and evidence references.
- Optional LLM polish must not change numbers, units, deadlines, recipients, required documents, or cited rules.
- The actor approving a draft must differ conceptually from the generator.
- No external message is sent without an explicit connector and an authorized human action.
- Treat document names as configurable project policy. `OSHA Form 300` is an injury/illness log, not a generic supplier safety certificate.

## Supabase/PostgreSQL implementation notes

- Choose the connection mode for the deployment: direct/session mode for a persistent FastAPI service; transaction mode for short-lived/serverless clients.
- If transaction pooling is used, configure the driver so prepared statements are compatible.
- Do not stack an oversized SQLAlchemy pool on top of a constrained server-side pooler.
- Enable and test RLS/grants for every Data API-exposed object, including functions.
- Scope vector retrieval by project/vendor and retain document/chunk provenance. With a small demo corpus, exact search is simpler than an approximate index.
- Keep migrations as the canonical schema. Seeder scripts must be repeatable and clearly synthetic.

## Verification expectations

`scripts/test_pipeline.py` contains a few assertion-based demo checks, but it
does not replace focused unit, API-contract, database, or end-to-end tests.

For each backend change, leave one smallest relevant assertion-based check. The backend test matrix must eventually cover:

- exact-limit, just-over-limit, missing, invalid-unit, and extreme inputs,
- corrupt, scanned, duplicate, oversized, and adversarial PDFs,
- extraction provenance and reviewer correction,
- upload idempotency and transaction rollback,
- project isolation, roles, and RLS/authorization,
- concurrent lifecycle and constraint updates,
- immutable re-audit replay,
- RFI approval/queue state transitions,
- list pagination/filter/sort and stable API errors,
- frontend contract and critical end-to-end flows.

Run at minimum:

```bash
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=backend python3 scripts/test_pipeline.py
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=backend python3 -m unittest discover -s backend/tests -v
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=backend python3 scripts/evaluate_extraction.py --assert-baseline
openspec validate robust-supabase-backend --strict
openspec validate multi-provider-pdf-extraction --strict
```

Only claim database, RAG, security, or end-to-end behavior after exercising that dependency and recording the evidence.
