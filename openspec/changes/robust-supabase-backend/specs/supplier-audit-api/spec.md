## ADDED Requirements

### Requirement: Supplier Intelligence and Geospatial API
The backend SHALL expose project-scoped supplier profiles with coordinate provenance and derived distance metrics.

#### Scenario: Supplier List Retrieval
- **WHEN** a client GETs `/api/v1/suppliers`
- **THEN** the system MUST return a paginated list containing supplier identifiers, coordinate provenance and verification state, active bid count, and versioned risk assessments

#### Scenario: Unverified supplier coordinates
- **WHEN** a supplier location is synthetic or unverified
- **THEN** the response MUST label its provenance and MUST NOT present route distance as verified supplier evidence

### Requirement: Bid Query API
The backend SHALL expose paginated bid list and detailed docket endpoints matching the frontend work queue and review workspace contract.

#### Scenario: Bid list retrieval
- **WHEN** a client calls `GET /api/v1/bids` with supported filters
- **THEN** the backend MUST return stable pagination metadata and summary records without embedding full source-document contents

#### Scenario: Bid detail retrieval
- **WHEN** an authorized client calls `GET /api/v1/bids/{id}`
- **THEN** the backend MUST return the docket, lifecycle state, latest and prior assessment references, evidence nodes, integrity signals, and RFI summaries for the requested project

### Requirement: System Audit Trail API
The backend SHALL enforce append-only audit records and provide authorized, paginated retrieval.

#### Scenario: Audit Log Retrieval
- **WHEN** a client GETs `/api/v1/audit/logs`
- **THEN** the system MUST return project-scoped actions, actors, targets, timestamps, request identifiers, and pagination metadata in stable order

#### Scenario: Attempted audit mutation
- **WHEN** an application role attempts to update or delete an existing audit event
- **THEN** the database MUST reject the operation

### Requirement: Dynamic $TCO^2$ Scenario Simulation
The backend SHALL calculate five-year TCO² scenarios from bounded inputs with explicit currency, time horizon, carbon functional unit, and tax units.

#### Scenario: Dynamic Scenario Simulation Request
- **WHEN** a client POSTs a simulation payload to `/api/v1/bids/simulate` with custom carbon tax rates or delay penalty multipliers
- **THEN** the system MUST validate input bounds, calculate and return each intermediate term, and MUST NOT persist the scenario as an official patrol result
