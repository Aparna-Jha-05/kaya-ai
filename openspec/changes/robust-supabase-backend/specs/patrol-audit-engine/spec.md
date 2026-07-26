## ADDED Requirements

### Requirement: Deterministic 4-Patrol Execution
The backend Patrol Engine Service SHALL evaluate validated, unit-normalized vendor facts against a referenced version of site constraints across Building Patrol, Green Patrol, Vice Squad, and Traffic Control. A generative model SHALL NOT choose any compliance status.

#### Scenario: Building Patrol Evaluation
- **WHEN** a bid provides normalized `power_kw` and `equipment_width_m` and the constraint version provides `max_substation_kw` and `door_clearance_m`
- **THEN** Patrol 1 MUST return `PASS` only when `power_kw <= max_substation_kw` and `equipment_width_m <= door_clearance_m`; otherwise it MUST return `FAIL` with the compared values, units, and breach deltas

#### Scenario: Green Patrol Evaluation
- **WHEN** a bid and constraint provide carbon values using the same documented functional unit
- **THEN** Patrol 2 MUST compare the normalized values and return `PASS` or `FAIL` with the functional unit and excess magnitude

#### Scenario: Incompatible carbon basis
- **WHEN** the bid carbon value and site limit use different or missing functional units
- **THEN** Patrol 2 MUST return `FLAG` for human review and MUST NOT compare dimensionally incompatible numbers

#### Scenario: Vice Squad Hybrid RAG Evaluation
- **WHEN** evaluating vendor reliability in Patrol 3
- **THEN** the system MUST search only evidence embedded with the configured model and vector dimension, cite the matched records, clamp the documented risk formula to 1.0 through 10.0, and return `FLAG` when the score exceeds 5.0

#### Scenario: No comparable vendor history
- **WHEN** no qualifying historical evidence is available for the vendor
- **THEN** Patrol 3 MUST return `FLAG` with reason `INSUFFICIENT_VENDOR_EVIDENCE` rather than treating missing history as low risk

#### Scenario: Traffic Control Penalty Evaluation
- **WHEN** a bid provides normalized lead-time days and all configured currency, delay-penalty, carbon-tax, and five-year cost inputs are available
- **THEN** Patrol 4 MUST calculate delay days, penalty, and TCO² using the documented units and return each intermediate term as evidence

### Requirement: Missing Evidence Is Never Guessed
The patrol engine SHALL return `FLAG` when a fact required for a patrol is missing, invalid, unsupported, or lacks source evidence.

#### Scenario: Missing power evidence
- **WHEN** no validated evidence supports `power_kw`
- **THEN** Building Patrol MUST return `FLAG` with the missing field and MUST NOT substitute a model-generated or default value

### Requirement: Synchronous Bid Audit Persistence
The backend SHALL execute the bounded deterministic upload pipeline synchronously for supported demo-size PDFs and save one versioned scorecard.

#### Scenario: PDF Upload Audit
- **WHEN** a client POSTs a valid PDF file to `/api/v1/bids/upload`
- **THEN** the backend MUST validate and hash the file, extract evidence, run all patrols, atomically persist the scorecard and audit entry, and return the documented response

#### Scenario: Processing exceeds the configured request deadline
- **WHEN** extraction cannot finish within the documented synchronous deadline
- **THEN** the backend MUST terminate or abandon the request safely, persist no partial scorecard, and return a retryable error
