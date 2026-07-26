## ADDED Requirements

### Requirement: Bid Lifecycle State Transition API
The backend SHALL provide an authorized `PATCH /api/v1/bids/{id}/status` endpoint with an explicit transition matrix and optimistic concurrency.

#### Scenario: Officer Lifecycle State Update
- **WHEN** an officer sends a PATCH request updating a bid status to `AWARDED`, `REJECTED`, or `RFI_PENDING`
- **THEN** the system MUST validate the transition and expected record version, update the lifecycle state, append an audit event, and return the updated docket

#### Scenario: Invalid or stale transition
- **WHEN** the requested transition is not allowed or its expected version is stale
- **THEN** the system MUST return a conflict response and MUST NOT modify the docket

### Requirement: Lifecycle Audit Tracking
The backend SHALL maintain audit records for all human officer decisions and lifecycle state updates.

#### Scenario: Officer Approval Logging
- **WHEN** an officer awards or rejects a bid docket
- **THEN** the system MUST record the authenticated officer identity, previous state, new state, reason, timestamp, and request identifier

### Requirement: Assessment and Decision Separation
Automated patrol results SHALL NOT directly overwrite lifecycle decisions made by procurement officers.

#### Scenario: Patrol result changes
- **WHEN** a new assessment changes the overall patrol status
- **THEN** the system MUST preserve the lifecycle state and create a review notification for the responsible officer
