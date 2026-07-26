## 0. Contract and Domain Freeze

- [ ] 0.1 Review `/api/v1` request, response, pagination, error, and lifecycle scenarios with the frontend owner
- [ ] 0.2 Obtain domain/QA approval for door-clearance semantics, carbon functional unit, Vice Squad scoring, and TCO² units
- [ ] 0.3 Export the current FastAPI OpenAPI document as the compatibility baseline

## 1. Versioned Database Foundation

- [ ] 1.1 Add only `asyncpg`, `pgvector`, and `pydantic-settings` to `backend/requirements.txt`
- [ ] 1.2 Add an ordered initial migration for `projects`, versioned `site_constraints`, `bids`, `extracted_facts`, `patrol_results`, `vendor_docs`, `rfis`, and append-only `audit_logs`
- [ ] 1.3 Add database constraints and indexes for project isolation, idempotency keys, document hashes, assessment versions, and the pinned embedding dimension
- [ ] 1.4 Add database enforcement preventing application roles from updating or deleting audit events
- [ ] 1.5 Add an idempotent demo seeder that labels every synthetic record
- [ ] 1.6 Verify migrations on an empty database and verify a second run is a no-op

## 2. Async PostgreSQL Service Layer

- [ ] 2.1 Create `backend/app/db/supabase.py` with a bounded `asyncpg` pool and parameterized query helpers
- [ ] 2.2 Bind validated settings for `SUPABASE_DATABASE_URL`, explicit `DEMO_MODE`, pool limits, and request deadlines
- [ ] 2.3 Add readiness checks and fail-visible behavior when required persistence is unavailable
- [ ] 2.4 Keep PDF parsing, embedding, and model calls outside database transactions

## 3. Source Ingestion and Document Integrity

- [ ] 3.1 Persist immutable source-document provenance and object-storage references
- [ ] 3.2 Create `backend/app/services/integrity.py` for SHA-256 exact-byte duplicate detection
- [ ] 3.3 Record metadata and parser anomalies as review signals without assigning fraud
- [ ] 3.4 Implement project-scoped idempotency behavior for retried uploads

## 4. Evidence Region Extraction

- [ ] 4.1 Update `backend/app/services/extractor.py` to retain raw excerpts, page numbers, coordinate systems, and `[x0, y0, x1, y1]` evidence rectangles
- [ ] 4.2 Normalize supported units while preserving original values and units
- [ ] 4.3 Report deterministic extraction-quality signals separately from model confidence
- [ ] 4.4 Return detected dimension annotations for the frontend and flag unsupported drawings instead of claiming full CAD parsing

## 5. Deterministic Patrol Engine

- [ ] 5.1 Update Building Patrol to compare normalized equipment power and width against the referenced constraint version
- [ ] 5.2 Update Green Patrol to require an approved, matching carbon functional unit
- [ ] 5.3 Implement Vice Squad `pgvector` search using a pinned embedding model and cited historical records
- [ ] 5.4 Implement the approved, bounded Vice Squad risk formula and missing-history flag
- [ ] 5.5 Implement Traffic Control with explicit currency, time horizon, penalty, carbon basis, and intermediate terms
- [ ] 5.6 Return `FLAG` for missing, incompatible, unsupported, or uncited required facts
- [ ] 5.7 Persist one versioned scorecard and audit event in a short atomic transaction

## 6. RFI Drafts

- [ ] 6.1 Create `backend/app/services/rfi.py` to render deterministic, evidence-bound operational drafts
- [ ] 6.2 Implement `POST /api/v1/agent/rfi-draft` with persistence and mandatory human-review status
- [ ] 6.3 Reject optional wording enhancements that alter protected facts, numbers, units, or citations

## 7. Constraint and Lifecycle Mutations

- [ ] 7.1 Implement authorized, expected-version site-constraint updates that create immutable versions
- [ ] 7.2 Create new affected patrol-result versions while preserving prior assessments
- [ ] 7.3 Implement the authorized docket lifecycle transition matrix with optimistic concurrency
- [ ] 7.4 Preserve officer decisions when automated assessments change and create an `ASSESSMENT_CHANGED` review event

## 8. Query APIs and Shared Contract

- [ ] 8.1 Implement paginated `GET /api/v1/bids` and detailed `GET /api/v1/bids/{id}`
- [ ] 8.2 Implement project-scoped `GET /api/v1/suppliers` with coordinate provenance
- [ ] 8.3 Implement append-only, paginated `GET /api/v1/audit/logs`
- [ ] 8.4 Implement bounded, non-persisted `POST /api/v1/bids/simulate`
- [ ] 8.5 Add consistent error responses, request identifiers, authorization enforcement, and readiness reporting
- [ ] 8.6 Export OpenAPI and verify backward compatibility with the frontend contract

## 9. Frontend Integration

- [ ] 9.1 Add typed API helpers without removing existing mock fallbacks
- [ ] 9.2 Connect work queue, portfolio, and review screens after their endpoints pass staging checks
- [ ] 9.3 Connect evidence, dimension, RFI, supplier, and audit screens after contract verification
- [ ] 9.4 Remove each mock fallback only after the corresponding backend endpoint is deployed

## 10. Verification and Delivery

- [ ] 10.1 Add assertion-based backend checks for missing evidence, unit mismatch, duplicate bytes, idempotency, concurrency, and immutable decisions
- [ ] 10.2 Run strict OpenSpec validation, backend checks, and the frontend production build in pull-request CI
- [ ] 10.3 Deploy the backend to staging only after required checks pass
- [ ] 10.4 Run staging health, OpenAPI, upload, patrol, and frontend compatibility smoke checks before production promotion
