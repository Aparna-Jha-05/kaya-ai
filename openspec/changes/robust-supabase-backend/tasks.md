## 0. Contract and Domain Freeze

- [ ] 0.1 Review `/api/v1` request, response, error, and lifecycle scenarios with the frontend owner
- [ ] 0.2 Obtain domain/QA approval for door-clearance semantics, carbon functional unit, Vice Squad scoring, and TCO² units
- [x] 0.3 Export the current FastAPI OpenAPI document as the compatibility baseline

## 1. Versioned Database Foundation

- [x] 1.1 Add only `asyncpg`, `pgvector`, and `pydantic-settings` to `backend/requirements.txt`
- [x] 1.2 Add an ordered initial migration for `projects`, versioned `site_constraints`, `bids`, `extracted_facts`, `patrol_results`, `vendor_docs`, `rfis`, and append-only `audit_logs`
- [x] 1.3 Add database constraints and indexes for project isolation, idempotency keys, document hashes, assessment versions, and the pinned embedding dimension
- [x] 1.4 Add database enforcement preventing application roles from updating or deleting audit events
- [x] 1.5 Add an idempotent demo seeder that labels every synthetic record
- [x] 1.6 Verify migrations on an empty PostgreSQL database and verify a second run is a no-op

## 2. Async PostgreSQL Service Layer

- [x] 2.1 Create `backend/app/db/supabase.py` with a bounded `asyncpg` pool and parameterized query helpers
- [x] 2.2 Bind validated settings for `SUPABASE_DATABASE_URL`, explicit `DEMO_MODE`, pool limits, and request deadlines
- [x] 2.3 Add readiness checks disclosing whether SQLite/demo or PostgreSQL mode is active
- [x] 2.4 Keep PDF parsing, embedding, and model calls outside database transactions

## 3. Source Ingestion and Document Integrity

- [x] 3.1 Persist immutable source-document provenance and local file references in SQLite
- [x] 3.2 Create `backend/app/services/integrity.py` for SHA-256 exact-byte duplicate detection
- [x] 3.3 Record metadata and parser anomalies as review signals without assigning fraud
- [x] 3.4 Implement project-scoped idempotency behavior for retried uploads

## 4. Evidence Region Extraction

- [x] 4.1 Update `backend/app/services/extractor.py` to retain raw excerpts, page numbers, coordinate systems, and `[x0, y0, x1, y1]` evidence rectangles
- [x] 4.2 Normalize supported units while preserving original values and units
- [x] 4.3 Report deterministic extraction-quality signals separately from model confidence
- [x] 4.4 Return detected dimension annotations for the frontend and flag unsupported drawings instead of claiming full CAD parsing

## 5. Deterministic Patrol Engine

- [x] 5.1 Update Building Patrol to compare normalized equipment power and width against the referenced constraint version
- [ ] 5.2 Update Green Patrol to require an approved, matching carbon functional unit
- [ ] 5.3 Implement Vice Squad `pgvector` search using a pinned embedding model and cited historical records
- [ ] 5.4 Implement the approved, bounded Vice Squad risk formula and missing-history flag
- [ ] 5.5 Implement Traffic Control with explicit currency, time horizon, penalty, carbon basis, and intermediate terms
- [x] 5.6 Return `FLAG` for missing, incompatible, unsupported, or uncited required facts
- [x] 5.7 Persist scorecard and activity events in SQLite transactions

## 6. RFI Drafts

- [x] 6.1 Create `backend/app/services/rfi.py` to render deterministic, evidence-bound operational drafts
- [x] 6.2 Implement `POST /api/v1/agent/rfi-draft` with SQLite persistence and mandatory DRAFT status
- [x] 6.3 Implement `PATCH /api/v1/rfis/{id}/approve` as a separate human approval action
- [x] 6.4 Reject optional wording enhancements that alter protected facts

## 7. Constraint and Lifecycle Mutations

- [x] 7.1 Implement versioned site-constraint updates in SQLite with optimistic concurrency (`expected_version`)
- [ ] 7.2 Create new affected patrol-result versions while preserving prior assessments
- [x] 7.3 Implement officer decision updates (`OfficerDecision`) with `expected_version` concurrency
- [ ] 7.4 Preserve officer decisions when automated assessments change

## 8. Query APIs and Shared Contract

- [ ] 8.1 Implement paginated `GET /api/v1/bids` and detailed `GET /api/v1/bids/{id}`
- [ ] 8.2 Implement project-scoped `GET /api/v1/suppliers` with verified coordinate provenance
- [ ] 8.3 Implement append-only, paginated `GET /api/v1/audit/logs`
- [x] 8.4 Implement bounded, non-persisted `POST /api/v1/bids/simulate`
- [ ] 8.5 Add consistent error responses, request identifiers, authorization enforcement, and readiness reporting

## 9. Frontend Integration

- [x] 9.1 Add typed API helpers in `lib/api.ts`
- [x] 9.2 Connect work queue, portfolio, and review screens
- [ ] 9.3 Connect evidence, dimension, RFI, supplier, and audit screens
- [ ] 9.4 Remove each mock fallback after production backend promotion

## 10. Verification and Delivery

- [x] 10.1 Add assertion-based backend tests for missing evidence, unit mismatch, duplicate bytes, officer decision concurrency, RFI approval, and site constraints
- [x] 10.2 Run strict OpenSpec validation
- [ ] 10.3 Deploy backend to staging after PR checks pass
- [ ] 10.4 Run staging health and production promotion checks
