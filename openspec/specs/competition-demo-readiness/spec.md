## Purpose

Define the public, deterministic, evidence-led competition prototype and the
repository-controlled gates required before it is described as demo-ready.

## Requirements

### Requirement: Public integrated demo
The system SHALL provide a public HTTPS frontend and backend pair for the competition, SHALL allow access without a platform account or deployment-protection login, and SHALL configure the frontend API origin and backend CORS policy to communicate only through the intended public origins.

#### Scenario: Judge opens the public application
- **WHEN** a judge opens the submitted frontend URL in a fresh browser session
- **THEN** the application loads without an authentication wall and can retrieve backend readiness and bid data

#### Scenario: Frontend origin calls the backend
- **WHEN** the submitted frontend sends an API request to the configured backend
- **THEN** the backend accepts the exact frontend origin and does not require a browser-visible credential

#### Scenario: Deployment revisions are checked
- **WHEN** the operator runs the pre-demo gate
- **THEN** the intended frontend and backend Git revisions are recorded and confirmed as the revisions serving the public demo

### Requirement: Deterministic synthetic demo dataset
The system SHALL bootstrap an idempotent, visibly synthetic dataset containing at least one recommended bid, one review-required bid, and one rejected bid with a deterministic hard constraint failure. The rejected bid SHALL have the lowest upfront price of the three so the demo can show why cost alone is insufficient.

#### Scenario: Fresh demo environment is seeded
- **WHEN** the demo bootstrap runs in an empty environment
- **THEN** the three narrative fixtures exist with stable identifiers and their asserted recommendation and patrol outcomes

#### Scenario: Bootstrap runs again
- **WHEN** the demo bootstrap runs after the narrative fixtures already exist
- **THEN** it updates or preserves the stable fixtures without creating duplicates

#### Scenario: Fixture claim changes unexpectedly
- **WHEN** extraction or patrol behavior no longer produces a fixture's asserted recommendation or decisive patrol status
- **THEN** the fixture verification fails and the deployment is not marked demo-ready

#### Scenario: Lowest-price bid is compared
- **WHEN** the judge compares the narrative fixtures by upfront price and compliance
- **THEN** the lowest-price fixture shows a cited deterministic hard failure and is not recommended

### Requirement: Judge-facing workflow
The system SHALL support a repeatable demo sequence from bid comparison through evidence review, RFI review, total-cost simulation, and audited human action, plus one known synthetic PDF upload.

#### Scenario: Seeded narrative is demonstrated
- **WHEN** the operator follows the documented demo sequence
- **THEN** the operator can compare the three fixtures, open the rejected bid, inspect its decisive evidence, create and approve an RFI draft, run a total-cost scenario, and show the resulting activity

#### Scenario: Known PDF is uploaded
- **WHEN** the operator uploads the documented synthetic PDF
- **THEN** the backend returns a persisted bid with extracted facts, deterministic patrol results, a recommendation, and a retrievable source document

#### Scenario: Human action follows automation
- **WHEN** an operator approves an RFI or records a reviewer decision
- **THEN** the action is stored separately from the automated assessment and appears in the activity trail

### Requirement: Evidence-led review
The review workspace SHALL display each demonstrated decision with its deterministic status and available rule input, limit, source excerpt, page number, and evidence geometry. The system MUST label unavailable evidence explicitly and MUST NOT invent a value, location, or interpretation.

#### Scenario: Located evidence is available
- **WHEN** a patrol result has a source excerpt, page, and bounding box or dimension annotation
- **THEN** the review workspace presents those values and links them to the corresponding rule result

#### Scenario: Evidence geometry is unavailable
- **WHEN** an extracted fact has text evidence but no validated geometry
- **THEN** the workspace shows the excerpt and page and labels the region as unavailable

#### Scenario: Evidence is insufficient
- **WHEN** a required fact lacks supported evidence or has unresolved disagreement
- **THEN** the deterministic outcome is FLAG or review-required rather than an inferred PASS

#### Scenario: Drawing capability is described
- **WHEN** the UI or submission documentation describes drawing evidence
- **THEN** it identifies detected PDF text regions or dimension annotations and does not claim full CAD or BIM interpretation

### Requirement: Recoverable frontend states
Every judge-facing data view SHALL render bounded loading, empty, failure, and retry behavior. An API failure MUST NOT leave the application in an indefinite loading state or replace missing data with mock success.

#### Scenario: Backend is cold or temporarily unavailable
- **WHEN** a dashboard, portfolio, case-file, upload, review, or activity request times out or fails
- **THEN** the view stops loading, explains that the service may be starting, and provides a retry action

#### Scenario: API returns no records
- **WHEN** a list request succeeds with an empty collection
- **THEN** the view shows an explicit empty state and the documented bootstrap or upload next step

#### Scenario: Retry succeeds
- **WHEN** a user retries after the backend becomes available
- **THEN** the view replaces the failure state with current API data without requiring a page reload

### Requirement: Model-independent operation
The public demo SHALL complete its seeded workflow and known-PDF upload with remote model extraction disabled. Optional Gemini extraction MUST use server-side configuration, MUST return the shared evidence-bound fact schema, and MUST NOT change deterministic constraint values or decision authority.

#### Scenario: No model key is configured
- **WHEN** the public backend starts without a Gemini or other remote model key
- **THEN** readiness, seeded records, upload, patrol decisions, RFI review, simulation, and activity remain usable through deterministic behavior

#### Scenario: Optional model fails
- **WHEN** optional Gemini extraction times out, reaches quota, or returns invalid or unsupported facts
- **THEN** the upload continues with validated deterministic evidence and unresolved facts become FLAG

#### Scenario: Browser inspects requests
- **WHEN** a user inspects frontend network requests and bundles
- **THEN** no provider API key or secret model credential is present

### Requirement: Deployed acceptance gate
The repository SHALL provide one repeatable deployed acceptance command that asserts public frontend reachability, backend readiness, exact-origin CORS, seeded outcomes, known-PDF upload idempotency, source retrieval, simulation, RFI review, reviewer action, and activity retrieval. The command SHALL exit non-zero on any failed assertion.

#### Scenario: Public demo passes
- **WHEN** the acceptance command runs against the submitted frontend and backend URLs
- **THEN** every required assertion passes and the command exits zero with no secret or document contents in its logs

#### Scenario: Integration is broken
- **WHEN** the frontend is protected, readiness is unhealthy, CORS is wrong, a fixture outcome drifts, or a required API flow fails
- **THEN** the command exits non-zero and identifies the failed gate without marking the demo ready

#### Scenario: Visual workflow is checked
- **WHEN** the automated command passes
- **THEN** the operator also completes the concise visual checklist for comparison, evidence, failure states, RFI, scenario, and activity before submission

### Requirement: Demo operations and recovery
The repository SHALL document a pre-demo checklist, demo-data bootstrap behavior, cold-start recovery, rollback steps, and final public URLs.

#### Scenario: Operator prepares the demo
- **WHEN** the operator follows the pre-demo checklist
- **THEN** CI is green, public URLs and revisions are recorded, fixtures are verified, deterministic mode is proven, and the acceptance and visual gates pass

#### Scenario: Live upload cannot complete
- **WHEN** a network, cold-start, or optional model failure interrupts the live upload
- **THEN** the operator can continue the same evidence-led story with the seeded record

#### Scenario: Deployment regresses
- **WHEN** the current deployment fails the readiness gate
- **THEN** the operator rolls back to the last approved revision or removes the failing step from the claimed demo before presenting

### Requirement: Honest and safe submission
Public documentation and demo narration SHALL distinguish implemented, optional, and planned capabilities. The public demo SHALL use only synthetic data and MUST NOT expose credentials, private vendor content, internal filesystem paths, or unsupported production-security claims.

#### Scenario: Submission claims are reviewed
- **WHEN** the README, architecture diagram, slides, and demo copy are prepared
- **THEN** Supabase persistence, authentication, RLS, pgvector RAG, full CAD/BIM interpretation, immutable production audit storage, and automatic external dispatch are described as planned unless runtime evidence proves otherwise

#### Scenario: Demo data is inspected
- **WHEN** a judge views a fixture, source PDF, log, RFI, or activity entry
- **THEN** the content is visibly synthetic and contains no real vendor or personal data

#### Scenario: Secrets are reviewed
- **WHEN** the public build, repository changes, logs, and network requests are inspected
- **THEN** no API key or credential is present

### Requirement: Competition go or no-go decision
The project SHALL be marked demo-ready only after pull-request CI, deployed acceptance, the visual checklist, deterministic fallback, fixture assertions, and claim review all pass for the submitted revision.

#### Scenario: Every gate passes
- **WHEN** all readiness evidence is recorded for the submitted revision
- **THEN** the operator may mark the project demo-ready

#### Scenario: Any gate fails
- **WHEN** one or more required gates lack evidence or fail
- **THEN** the project remains not-ready and the failed item is fixed, removed from the demo claim, or explicitly disclosed before submission
