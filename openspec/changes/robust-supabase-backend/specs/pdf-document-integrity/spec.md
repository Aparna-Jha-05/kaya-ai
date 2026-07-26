## ADDED Requirements

### Requirement: SHA-256 PDF Fingerprinting
The backend SHALL compute and persist a SHA-256 fingerprint for the exact bytes of every accepted PDF before extraction begins.

#### Scenario: Exact duplicate PDF submission
- **WHEN** an uploaded PDF has the same SHA-256 fingerprint as an existing document in the same project
- **THEN** the system MUST identify the existing document, attach a `DUPLICATE_BYTES` integrity signal, and apply the documented idempotency policy without describing the signal as proof of fraud

#### Scenario: Same content with different bytes
- **WHEN** two PDFs contain similar visible text but have different SHA-256 fingerprints
- **THEN** the system MUST NOT label them exact duplicates solely from their textual similarity

### Requirement: PDF Metadata Anomaly Signals
The backend SHALL record available PDF creation date, modification date, producer, encryption state, and structural parsing warnings as review signals.

#### Scenario: Suspicious metadata relationship
- **WHEN** a PDF modification timestamp predates its creation timestamp or parsing reports a structural anomaly
- **THEN** the system MUST record the specific signal and evidence while leaving the final interpretation to a human reviewer

#### Scenario: Missing metadata
- **WHEN** a PDF omits optional metadata
- **THEN** the system MUST record the metadata as unavailable and MUST NOT infer tampering
