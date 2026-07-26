## ADDED Requirements

### Requirement: Versioned Database Initialization
The backend SHALL provide ordered, versioned SQL migrations for Supabase PostgreSQL and SHALL keep demo data outside schema migrations.

#### Scenario: Apply migrations to an empty database
- **WHEN** the migration command runs against an empty supported Supabase database
- **THEN** it MUST create `projects`, `site_constraints`, `bids`, `extracted_facts`, `patrol_results`, `vendor_docs`, `rfis`, and `audit_logs` with primary keys, foreign keys, validation constraints, indexes, and pinned `pgvector` dimensions

#### Scenario: Reapply completed migrations
- **WHEN** the migration command runs after all migrations are already applied
- **THEN** it MUST make no destructive schema changes and MUST report that the database is current

#### Scenario: Database seeding
- **WHEN** `scripts/seed_supabase.py` is executed
- **THEN** documented demo constraints, historical vendor dispute embeddings, and synthetic bids MUST be inserted idempotently and marked as synthetic

### Requirement: Project-Scoped Persistence
Every site constraint, bid, extracted fact, patrol result, RFI, and audit event SHALL reference a project so records cannot be mixed between procurement projects.

#### Scenario: Cross-project lookup
- **WHEN** an actor requests a record belonging to another project
- **THEN** the backend MUST return the documented not-found or forbidden response and MUST NOT expose the record

### Requirement: Immutable Source Document Provenance
The database SHALL store an immutable object-storage reference, SHA-256 fingerprint, original filename, media type, byte length, uploader identity, and ingestion time for each accepted source document.

#### Scenario: Persist accepted upload
- **WHEN** PDF validation and object storage succeed
- **THEN** the backend MUST persist the document provenance before associating extracted facts with the docket

### Requirement: Asynchronous PostgreSQL Connection Layer
The FastAPI backend SHALL connect directly to Supabase PostgreSQL using a bounded `asyncpg` connection pool.

#### Scenario: Database Query Execution
- **WHEN** FastAPI receives an API request requiring database persistence or vector lookup
- **THEN** the system MUST execute parameterized queries asynchronously and return the connection to the pool on success or failure

#### Scenario: External processing before persistence
- **WHEN** an upload requires PDF parsing, embedding, or model inference
- **THEN** the backend MUST complete that external work before opening the short transaction that persists the docket and audit records

### Requirement: Explicit Demo Mode
The backend SHALL NOT silently replace failed persistent writes with in-memory success responses.

#### Scenario: Database unavailable in normal mode
- **WHEN** required database access fails and demo mode is disabled
- **THEN** the backend MUST return a service-unavailable error with a request identifier

#### Scenario: Explicit demo mode
- **WHEN** `DEMO_MODE=true` and database credentials are absent
- **THEN** the backend MAY use documented ephemeral data and MUST label responses as demo data
