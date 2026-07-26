## ADDED Requirements

### Requirement: Versioned OpenAPI Contract
The backend SHALL expose an OpenAPI contract for all `/api/v1` endpoints and SHALL treat additive fields as backward-compatible within version 1.

#### Scenario: Contract publication
- **WHEN** the FastAPI application starts
- **THEN** `/openapi.json` MUST describe every deployed request model, response model, status code, and authentication requirement

#### Scenario: Breaking response change
- **WHEN** a change removes or reinterprets a field consumed by the frontend
- **THEN** the change MUST use a new API version or a staged compatibility period instead of silently changing `/api/v1`

### Requirement: Consistent API Errors
The backend SHALL return errors with `code`, `message`, `request_id`, and optional field-level `details`.

#### Scenario: Invalid request
- **WHEN** input validation fails
- **THEN** the endpoint MUST return the documented 4xx status and error schema without exposing stack traces or secrets

### Requirement: Pagination and Stable Ordering
List endpoints SHALL use bounded pagination and deterministic ordering.

#### Scenario: Bid list request
- **WHEN** a client requests `GET /api/v1/bids` without pagination arguments
- **THEN** the backend MUST apply documented defaults, a maximum page size, and stable ordering by creation time and identifier

### Requirement: Authorization at Mutation Boundaries
The backend SHALL derive actor identity and role from trusted server-side authentication for lifecycle and site-constraint mutations.

#### Scenario: Unauthorized mutation
- **WHEN** an unauthenticated or unauthorized client calls a protected mutation endpoint
- **THEN** the backend MUST reject the request and MUST NOT change data

### Requirement: Idempotent Uploads and Mutations
The backend SHALL support an idempotency key for retryable write requests and SHALL prevent the same key from creating multiple logical records.

#### Scenario: Retried upload
- **WHEN** a client repeats a completed upload request with the same actor, project, and idempotency key
- **THEN** the backend MUST return the original logical result without creating a second docket

### Requirement: Health Reporting
The backend SHALL expose liveness and readiness information without returning secret configuration.

#### Scenario: Readiness check
- **WHEN** the deployment platform requests the readiness endpoint
- **THEN** the backend MUST report whether required dependencies are available and include the application version or build identifier
