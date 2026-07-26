## ADDED Requirements

### Requirement: Evidence-Bound RFI Draft Generation
The backend SHALL generate an operational Request For Information draft from stored facts, constraint versions, patrol findings, and evidence nodes. Every draft SHALL require human review before sending.

#### Scenario: RFI Synthesis Request
- **WHEN** a client POSTs a request to `/api/v1/agent/rfi-draft` with a `bid_id`
- **THEN** the system MUST retrieve the versioned assessment inputs, render a deterministic draft with evidence citations, persist the draft and provenance, and return its structured sections and review status

#### Scenario: Unsupported clause assertion
- **WHEN** no stored evidence supports a requested clause or breach statement
- **THEN** the draft MUST omit the assertion or mark it for review and MUST NOT manufacture a legal or contractual citation

### Requirement: Optional Wording Enhancement
An optional language model MAY rewrite prose, but immutable facts, numbers, units, evidence references, required sections, and review status SHALL be supplied by deterministic code and revalidated after generation.

#### Scenario: Provider unavailable
- **WHEN** no configured language provider is available or the provider request fails
- **THEN** the system MUST return the deterministic template without failing the RFI request

#### Scenario: Enhanced draft changes a protected fact
- **WHEN** a generated response changes or omits protected evidence values
- **THEN** the system MUST reject the enhanced response, retain the deterministic draft, and record the validation failure
