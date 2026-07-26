## ADDED Requirements

### Requirement: Shared Structured Fact Contract
Every deterministic or model extractor SHALL return candidates through one versioned Pydantic schema before downstream use.

#### Scenario: Valid structured candidate
- **WHEN** an extractor returns a candidate fact
- **THEN** the candidate MUST include the field, raw and normalized values, unit, source excerpt or source status, page when applicable, extractor, provider, model, and schema version

#### Scenario: Schema-invalid provider response
- **WHEN** a provider response cannot be validated against the shared schema
- **THEN** the system MUST reject the response, record the validation failure, and MUST NOT pass its values to a patrol

### Requirement: Local-First Extraction Cascade
The system SHALL run deterministic extraction before optional model extraction and SHALL call no more providers than required to resolve configured fields.

#### Scenario: Deterministic extraction is complete
- **WHEN** all required facts have valid units and source evidence after deterministic parsing
- **THEN** the system MUST skip Ollama, Gemini, and Claude

#### Scenario: Local model resolves missing fields
- **WHEN** deterministic extraction leaves required facts unresolved and configured Ollama output validates with source evidence
- **THEN** the system MUST accept eligible candidates without making a remote provider request

#### Scenario: Local provider unavailable
- **WHEN** Ollama is disabled, unreachable, or exceeds its deadline
- **THEN** the system MUST preserve deterministic results, record provider unavailability, and continue to an authorized remote fallback or unresolved-field review

### Requirement: Evidence-Bound Candidate Acceptance
A model-extracted fact SHALL NOT be accepted merely because it is schema-valid or multiple providers agree.

#### Scenario: Candidate lacks source support
- **WHEN** a model returns a value that cannot be matched to source evidence or an allowed document-level field
- **THEN** the system MUST reject the candidate and mark the field unresolved

#### Scenario: Candidate unit is incompatible
- **WHEN** a candidate unit cannot be converted to the field's approved unit or functional basis
- **THEN** the system MUST reject the normalized value and produce a unit-review signal

### Requirement: Controlled Remote Corroboration
Remote processing SHALL be disabled by default and SHALL require server-side credentials plus an explicit deployment and project policy.

#### Scenario: Remote processing not authorized
- **WHEN** required facts remain unresolved but remote processing is not enabled for the project
- **THEN** the system MUST keep the facts unresolved and MUST NOT send document content externally

#### Scenario: Remote fallback authorized
- **WHEN** required facts remain unresolved, remote processing is authorized, and a provider is configured
- **THEN** the system MUST send only the minimum required content to one provider and record provider, model, fields disclosed, timestamp, and result

#### Scenario: Browser requests provider credentials
- **WHEN** a frontend client requests configuration or extraction status
- **THEN** the backend MUST NOT return API keys, secret headers, or secret environment values

### Requirement: Disagreement Handling
The system SHALL compare candidates by normalized value, unit, and evidence rather than by free-text similarity.

#### Scenario: Material extractor disagreement
- **WHEN** eligible extractors return materially different values for the same field
- **THEN** the system MUST retain each candidate and its evidence, mark the field disputed, and require human review

#### Scenario: Equivalent normalized values
- **WHEN** extractors return values that normalize to the same value and approved unit with source support
- **THEN** the system MAY select the candidate with the strongest evidence while retaining all provenance

### Requirement: Models Cannot Decide Compliance
Model output SHALL be limited to extraction candidates and explanatory prose; deterministic code SHALL retain exclusive authority over patrol results.

#### Scenario: Provider emits a compliance verdict
- **WHEN** a provider response includes `PASS`, `FAIL`, a threshold, or a recommended lifecycle action
- **THEN** the system MUST ignore that verdict for decision-making and evaluate only validated facts through deterministic patrol logic

### Requirement: Provider Failure Isolation
Provider errors SHALL not create guessed values or silently convert an unresolved patrol to `PASS`.

#### Scenario: Provider timeout or rate limit
- **WHEN** a configured provider times out, rate-limits, or returns a server error
- **THEN** the system MUST record a bounded error, avoid unbounded retries, and leave affected facts unresolved

### Requirement: Measurable Extraction Evaluation
The repository SHALL include labeled, synthetic or redistributable evaluation fixtures and a repeatable report for each supported extraction configuration.

#### Scenario: Evaluate a model configuration
- **WHEN** the evaluation harness runs for a pinned provider and model
- **THEN** it MUST report field accuracy, unit accuracy, unsupported-value invention, evidence support, unresolved fields, disagreements, stage latency, remote request count, and estimated cost

#### Scenario: Change default model or escalation threshold
- **WHEN** a pull request changes the default local model or escalation policy
- **THEN** it MUST include updated evaluation evidence or explicitly retain the previous default

### Requirement: Prompt-Injection Resistance
PDF content SHALL be treated as untrusted data and model extraction SHALL run without tools or authority to change system behavior.

#### Scenario: Document contains instructions to the model
- **WHEN** a vendor PDF asks the model to ignore rules, invent fields, expose secrets, or mark the bid compliant
- **THEN** the extractor MUST treat the text only as document content, expose no tools or secrets, and accept only evidence-supported schema fields
