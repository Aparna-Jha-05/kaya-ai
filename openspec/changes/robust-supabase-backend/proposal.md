## Why

The PO-lice frontend is built with complete UI workflows (Work Queue, Bid Portfolio, Detailed Review Workspace with 4 Patrols, Evidence Board SVG, dimension visualizer, $TCO^2$ slider, RFI Modal, Supplier Map, Audit Log). However, the current backend relies on mock static data and incomplete in-memory state. To make the prototype functional and auditable, we need versioned Supabase persistence, deterministic patrol execution, PDF evidence-region extraction, reviewed RFI drafts, dynamic site constraints, document integrity signals, docket lifecycle management, and a stable API contract for every frontend workflow.

## What Changes

- **Supabase Database Schema & Seeder**: Add versioned SQL migrations defining `projects`, `site_constraints`, `bids`, `extracted_facts`, `patrol_results`, `vendor_docs` (with `pgvector`), `rfis`, and append-only `audit_logs`, plus an idempotent demo seeder.
- **Async PostgreSQL Database Layer**: Implement `backend/app/db/supabase.py` using `asyncpg` connection pooling and short transactions.
- **Synchronous PDF Upload & 4-Patrol Pipeline**: Update `POST /api/v1/bids/upload` to extract PDF data, execute all 4 Patrol checks (Building, Green, Vice, Traffic) against Supabase site constraints, and persist the docket scorecard.
- **PyMuPDF Evidence Region Parser**: Enhance `backend/app/services/extractor.py` to extract text blocks, page rectangle coordinates `[x0, y0, x1, y1]`, quality signals, and detected dimension annotations for front-end visualizers.
- **Counter-Spec RFI Generator Endpoint**: Implement `POST /api/v1/agent/rfi-draft` delivering human-reviewable operational drafts citing exact site constraint breaches and evidence nodes.
- **Dynamic Site Constraint Management**: Implement `PUT /api/v1/site-constraints` to create versioned site limits and produce new assessments without overwriting prior results or human decisions.
- **SHA-256 Document Integrity & Duplicate Detection**: Implement PDF hash fingerprinting and metadata anomaly signals in `backend/app/services/integrity.py`; these signals support review but do not prove fraud.
- **Docket Lifecycle Management**: Implement `PATCH /api/v1/bids/{id}/status` allowing officers to transition bid lifecycle states (`PRE_AWARD`, `AWARDED`, `REJECTED`, `RFI_PENDING`) with automated audit log entries.
- **Supplier & Audit API Endpoints**: Implement `GET /api/v1/bids`, `GET /api/v1/bids/{id}`, `GET /api/v1/suppliers`, and `GET /api/v1/audit/logs`.
- **Versioned API Contract**: Publish FastAPI OpenAPI output, stable error responses, pagination rules, and authorization requirements for frontend integration.
- **Frontend API Integration Layer**: Add typed client functions in `lib/api.ts`; retain explicit demo fallbacks until the matching backend endpoint is deployed.

## Capabilities

### New Capabilities

- `supabase-db-persistence`: Versioned Supabase PostgreSQL schema with `pgvector` extension for storing projects, site constraints, bid dockets, extracted facts, patrol results, vendor dispute RAG memory, generated RFIs, and audit trails.
- `patrol-audit-engine`: Synchronous 4-Patrol execution engine (Building, Green, Vice, Traffic) evaluating extracted PDF specifications against database constraints.
- `evidence-cad-extraction`: PyMuPDF evidence-region parser extracting `[x0, y0, x1, y1]` bounding boxes, provenance, quality signals, and detected dimension annotations. Full CAD/BIM parsing is not included.
- `rfi-synthesizer`: Structured counter-spec RFI generator producing human-reviewable operational drafts from immutable evidence and site constraint breaches.
- `supplier-audit-api`: REST API endpoints providing supplier map locations, immutable audit logs, and $TCO^2$ scenario simulation.
- `site-constraint-management`: API service for creating versioned project site limits and triggering versioned docket re-assessments.
- `pdf-document-integrity`: SHA-256 fingerprinting and PDF metadata anomaly service to identify exact duplicates and review signals without claiming fraud detection.
- `docket-lifecycle-management`: Endpoint for managing bid decision lifecycle states and recording audit events.
- `backend-api-contract`: Versioned OpenAPI contract, consistent errors, pagination, authorization, idempotency, and health reporting shared by frontend and backend.

### Modified Capabilities

(None)

## Impact

- **Backend**: Update `backend/main.py`, `backend/app/models/schemas.py`, `backend/app/services/extractor.py`, `backend/app/services/patrols.py`, `backend/app/services/integrity.py`, and create `backend/app/db/supabase.py` & `backend/app/services/rfi.py`.
- **Documentation**: Maintain backend architecture and operational guidance in the tracked agent documentation and OpenSpec artifacts. The ignored `docs/` directory remains local unless the team explicitly changes that policy.
- **Database**: Adds Supabase PostgreSQL tables and `pgvector` index for vendor dispute similarity search.
- **Frontend**: Connects Next.js components (`WorkQueue`, `BidPortfolio`, `BidReviewWorkspace`, `PatrolRunner`, `EvidenceBoard`, `SupplierLocationMap`, `AuditLog`) to FastAPI REST endpoints.
- **Dependencies**: Adds `asyncpg`, `pgvector`, and `pydantic-settings` to `backend/requirements.txt`. SQLAlchemy is intentionally excluded until an ORM need is demonstrated.
