## ADDED Requirements

### Requirement: Validated Provider Configuration
The backend SHALL support deterministic, auto, Ollama, Gemini, OpenAI, and Anthropic extraction modes while keeping every provider model identifier and credential under server-side configuration.

#### Scenario: Remote provider is completely configured
- **WHEN** a remote provider has both a non-empty server-side API key and model identifier and remote extraction is enabled
- **THEN** the backend MUST mark that provider available subject to project authorization

#### Scenario: Remote provider configuration is incomplete
- **WHEN** a remote provider is missing its API key or model identifier
- **THEN** the backend MUST mark it unavailable and MUST NOT attempt a request to that provider

#### Scenario: Automatic provider order is invalid
- **WHEN** the configured remote provider order contains an unknown provider, a local-only mode, or a duplicate
- **THEN** backend settings validation MUST fail before serving extraction requests

### Requirement: Secret-Free Provider Discovery
The backend SHALL expose a canonical provider-capability response that frontend clients can use without duplicating deployment configuration.

#### Scenario: Frontend requests provider capabilities
- **WHEN** a client requests `GET /api/v1/extraction/providers`
- **THEN** the backend MUST return the default mode and each provider's identifier, availability, remote status, and configured model identifier when available

#### Scenario: Capability response is serialized
- **WHEN** any provider-capability response is returned
- **THEN** it MUST NOT contain API keys, authorization headers, secret environment values, or remote project authorization lists

### Requirement: Backward-Compatible Upload Selection
The bid upload API SHALL accept an optional extraction mode while preserving `auto` as the behavior for clients that omit it.

#### Scenario: Existing client uploads without a mode
- **WHEN** a valid PDF upload omits `extraction_mode`
- **THEN** the backend MUST process it using `auto` mode

#### Scenario: Client selects an available mode
- **WHEN** a valid PDF upload includes an available `extraction_mode`
- **THEN** the backend MUST use that routing instruction after deterministic parsing

#### Scenario: Client selects an unavailable or unknown mode
- **WHEN** a PDF upload requests an unknown mode or a provider unavailable in the deployment
- **THEN** the backend MUST reject the selection before sending document content to any remote provider

#### Scenario: Client submits a model identifier
- **WHEN** a client attempts to select an arbitrary model identifier, endpoint, key, or provider order
- **THEN** the backend MUST ignore or reject that value and MUST use only validated server-side provider configuration

### Requirement: Deterministic-First Provider Routing
The extraction service SHALL always run deterministic parsing first and SHALL avoid model calls when deterministic evidence resolves all configured fields.

#### Scenario: Deterministic mode is selected
- **WHEN** `deterministic` mode is selected
- **THEN** the backend MUST skip Ollama and every remote provider regardless of unresolved fields

#### Scenario: Deterministic extraction is complete
- **WHEN** deterministic extraction resolves all configured fields with valid evidence and units
- **THEN** the backend MUST skip every configured model provider in all routing modes

#### Scenario: Explicit provider is selected
- **WHEN** deterministic extraction leaves fields unresolved and an available explicit provider mode is selected
- **THEN** the backend MUST try only that provider for the unresolved fields

### Requirement: Bounded Automatic Routing
Automatic routing SHALL prefer configured local extraction and SHALL make at most one authorized remote provider attempt per upload.

#### Scenario: Ollama resolves remaining fields
- **WHEN** `auto` mode is selected, Ollama is enabled, and its validated candidates resolve all remaining fields
- **THEN** the backend MUST skip every remote provider

#### Scenario: Automatic remote selection is required
- **WHEN** `auto` mode still has unresolved fields after eligible local extraction
- **THEN** the backend MUST select the first available and authorized provider from the validated remote provider order

#### Scenario: Selected automatic remote provider fails
- **WHEN** the selected remote provider times out, rate-limits, is unavailable at runtime, or returns an invalid response
- **THEN** the backend MUST record a bounded issue, leave affected facts unresolved, and MUST NOT silently call a second remote provider for that upload

### Requirement: Provider-Neutral Structured Extraction
Gemini, OpenAI, Anthropic, and Ollama adapters SHALL return candidates through the same Pydantic response contract before candidate acceptance.

#### Scenario: OpenAI returns structured candidates
- **WHEN** OpenAI returns a provider-specific structured response
- **THEN** the adapter MUST translate it into the shared response contract and the backend MUST validate evidence and units before accepting any candidate

#### Scenario: Anthropic returns structured candidates
- **WHEN** Anthropic returns a provider-specific structured response
- **THEN** the adapter MUST translate it into the shared response contract and the backend MUST validate evidence and units before accepting any candidate

#### Scenario: Provider returns unsupported fields or a verdict
- **WHEN** any provider returns an unrequested field, unsupported source excerpt, threshold, compliance verdict, or lifecycle action
- **THEN** the backend MUST reject it from extraction decisions and MUST NOT pass it to patrol decision logic

### Requirement: Remote Authorization and Disclosure Audit
Every remote extraction attempt SHALL require deployment and project authorization and SHALL record the actual provider and model used.

#### Scenario: Explicit remote mode is not authorized
- **WHEN** a client selects Gemini, OpenAI, or Anthropic but remote processing is disabled or the project is not authorized
- **THEN** the backend MUST send no document content externally and MUST leave unresolved facts available for review

#### Scenario: Remote provider is called
- **WHEN** an authorized remote provider receives unresolved evidence context
- **THEN** the backend MUST send only minimum required content and record project, actual provider, configured model, disclosed fields, and timestamp

#### Scenario: Runtime provider failure is recorded
- **WHEN** a remote provider request fails after authorization
- **THEN** the extraction report MUST identify the attempted provider without including credentials or raw secret values

### Requirement: Deterministic Decision Authority
Provider selection SHALL NOT change the deterministic authority of patrol calculations, thresholds, statuses, recommendations, or lifecycle actions.

#### Scenario: Different providers extract equivalent facts
- **WHEN** two separately requested providers produce equivalent evidence-supported normalized facts
- **THEN** the same deterministic rule inputs MUST produce the same patrol outputs

#### Scenario: Provider output is missing or disputed
- **WHEN** the selected provider cannot produce an evidence-supported fact or materially disagrees with accepted evidence
- **THEN** the fact MUST remain unresolved or disputed and the backend MUST NOT invent a default or silently produce `PASS`

### Requirement: Evaluated Provider Promotion
A remote provider/model combination SHALL NOT become part of the deployed automatic provider order without repeatable evaluation evidence.

#### Scenario: Provider model is evaluated
- **WHEN** the labeled evaluation harness runs for Gemini, OpenAI, or Anthropic
- **THEN** it MUST report the configured model identifier, field and unit accuracy, unsupported-value invention, evidence support, unresolved fields, disagreements, latency, remote request count, and estimated cost

#### Scenario: Automatic order changes
- **WHEN** a pull request changes the staging or production automatic provider order or model identifier
- **THEN** it MUST include updated evaluation results for the promoted provider/model and a successful deterministic-only rollback check

#### Scenario: Live provider credentials are absent in CI
- **WHEN** unit and contract tests run without live provider credentials
- **THEN** they MUST use stubbed provider transports and MUST NOT require network access or secrets
