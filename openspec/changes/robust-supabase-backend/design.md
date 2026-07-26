## Context

The PO-lice Next.js 14 frontend features a rich user interface (Work Queue, Bid Portfolio, Deep Bid Review, 4 Patrols, Evidence Board SVG, CAD Visualizer, Confidence Heatmap, $TCO^2$ Slider, RFI Modal, Supplier Map, Audit Log). However, the existing FastAPI backend operates in-memory with partial mock models and lacks database persistence and full endpoint coverage.

This design establishes an auditable Supabase (PostgreSQL + `pgvector`) architecture, an async database service layer, a PyMuPDF evidence-region parser, deterministic RFI templates, versioned site constraint re-assessment, SHA-256 document integrity signals, and a versioned REST contract. Optional multi-provider model extraction is specified separately so it can evolve without blocking database work.

---

## 🎯 The Four Patrols Specification

| Patrol | Check Type | Mathematical & Deterministic Rule | Output |
| :--- | :--- | :--- | :--- |
| **Patrol 1: Building Patrol** | Engineering Limits | $\text{Power}_{\text{kW}} \le \text{Cap}_{\text{kW}}$ <br> $\text{EquipmentWidth}_{\text{m}} \le \text{DoorClearance}_{\text{m}}$ | PASS / FAIL / FLAG with evidence |
| **Patrol 2: Green Patrol** | Embodied Carbon | Compare carbon only when the bid and constraint use the same documented functional unit | PASS / FAIL / FLAG with evidence |
| **Patrol 3: Vice Squad** | Vendor RAG Memory | Cosine similarity over versioned, cited vendor evidence; clamp the documented risk formula to 1–10 | PASS / FLAG with cited matches |
| **Patrol 4: Traffic Control** | Delay Penalty & $TCO^2$ | Use explicit days, currency, time horizon, carbon basis, and tax units; return intermediate terms | PASS / FLAG with financial evidence |

---

## Goals / Non-Goals

**Goals:**
- **Zero Hallucination Engineering Compliance**: Enforce strict, deterministic SQL and Python math rules against Supabase `site_constraints`.
- **Database Persistence**: Store project-scoped source provenance, bid dockets, extracted facts, patrol result versions, vendor embeddings, RFI drafts, constraint versions, and append-only audit events.
- **Synchronous Upload & Patrol Execution**: `POST /api/v1/bids/upload` parses PDF files, runs SHA-256 fraud detection, executes all 4 Patrols, and persists complete `DocketScorecard` structures in a single transaction.
- **Evidence Visualization Support**: Provide PDF page bounding boxes `[x0, y0, x1, y1]`, raw excerpts, extraction methods, quality signals, and detected dimension annotations without claiming full CAD/BIM support.
- **Dynamic Re-assessment**: Constraint updates create immutable versions and new patrol assessments while preserving prior results and human lifecycle decisions.
- **Full API Coverage**: Expose endpoints for `bids`, `suppliers`, `simulate`, `rfi-draft`, `site-constraints`, and `audit/logs`.
- **Stable Integration Contract**: Publish OpenAPI, consistent errors, pagination, authorization requirements, and idempotency behavior.

**Non-Goals:**
- Replacing Next.js App Router with an external frontend framework.
- Running heavy distributed background task queues (Celery/RabbitMQ) for single PDF uploads.
- Utilizing non-deterministic LLMs for numerical limit checks or engineering threshold decisions.
- Training or selecting the optional extraction model; that work belongs to `multi-provider-pdf-extraction`.
- Full CAD/BIM geometry reconstruction.

---

## Technical Decisions

### Decision 1: Direct Supabase PostgreSQL Access via `asyncpg`
- **Choice**: FastAPI connects directly to Supabase PostgreSQL using a bounded `asyncpg` pool and parameterized SQL. SQLAlchemy is not introduced.
- **Rationale**: The service has a small, explicit schema and needs direct `pgvector` queries. One SQL representation is simpler to migrate and audit.

### Decision 2: Synchronous PDF Upload & 4-Patrol Execution Pipeline
- **Choice**: For bounded demo-size PDFs, upload synchronously runs validation and hashing $\rightarrow$ evidence extraction $\rightarrow$ deterministic patrols $\rightarrow$ short persistence transaction.
- **Rationale**: This preserves the current simple frontend interaction. The system makes no unverified latency promise and returns a retryable error if the configured deadline is exceeded. Durable background jobs remain a later option if measured workloads require them.

### Decision 3: PyMuPDF Evidence Regions and Quality Signals
- **Choice**: `PDFExtractorService` uses PyMuPDF block extraction and search to retain page rectangles, raw excerpts, parser method, units, and deterministic quality signals.
- **Rationale**: PyMuPDF rectangles are evidence regions, not statistical confidence or full CAD geometry. Unsupported drawings are flagged for review.

### Decision 4: Deterministic Structured RFI Synthesis
- **Choice**: `POST /api/v1/agent/rfi-draft` compiles immutable evidence into an operational draft requiring human review. Optional wording enhancement can change prose only and is rejected if protected facts change.

### Decision 5: Versioned Site Constraints and Assessments
- **Choice**: A constraint update creates a new version and new affected patrol-result versions. It never overwrites prior assessments or officer lifecycle decisions.

### Decision 6: SHA-256 Document Integrity Signals
- **Choice**: `backend/app/services/integrity.py` identifies exact duplicate bytes and records metadata anomalies. These are review signals, not proof of fraud or pre-submission tampering.

### Decision 7: Versioned API Contract
- **Choice**: FastAPI's OpenAPI output is the frontend/backend contract. CI validates the specification, backend smoke tests, and frontend build on every pull request.
- **Rationale**: Additive backend changes can deploy before frontend adoption; breaking changes require a new API version or staged compatibility window.

### Decision 8: Explicit Failure Modes
- **Choice**: Persistent mode fails visibly when required infrastructure is unavailable. Ephemeral fallback is allowed only with `DEMO_MODE=true` and is labeled in responses.
- **Rationale**: Silent fallback would acknowledge writes that disappear and undermine the audit trail.

---

## Risks / Trade-offs

- **[Risk]**: Database connection latency or Supabase downtime during demo.
  - **Mitigation**: Perform a readiness check before the demo and provide an explicit, visibly labeled demo mode. Never silently switch storage modes during a request.
- **[Risk]**: Missing `pgvector` extension in target Supabase instance.
  - **Mitigation**: Verify the extension during migration and readiness. If unavailable, Vice Squad returns `FLAG` with `VENDOR_MEMORY_UNAVAILABLE`; it does not silently change similarity algorithms.
- **[Risk]**: Domain thresholds or units remain ambiguous.
  - **Mitigation**: Domain/QA approval is required for each functional unit and formula before its patrol can return `PASS` or `FAIL`.
- **[Risk]**: Concurrent constraint or lifecycle writes overwrite decisions.
  - **Mitigation**: Use immutable versions, expected-version checks, short transactions, and append-only audit events.

---

## Migration & Verification Plan

1. Freeze the `/api/v1` request/response scenarios with the frontend owner and obtain domain approval for units and formulas.
2. Apply versioned migrations to a disposable database, reapply them to prove idempotency, and verify append-only audit enforcement.
3. Run the idempotent demo seeder and label all synthetic records.
4. Run unit and integration checks for missing evidence, unit mismatch, duplicate bytes, concurrency conflicts, and preservation of human decisions.
5. Export FastAPI OpenAPI and verify the frontend contract against it.
6. Deploy backend staging after CI, run health and cross-stack smoke checks, then promote the verified commit.
