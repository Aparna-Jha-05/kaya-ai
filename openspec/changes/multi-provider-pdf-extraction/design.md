## Context

The current backend extracts a small set of PDF values with PyMuPDF and regular expressions. The frontend needs evidence-backed facts from more varied bid documents, while project policy requires deterministic SQL and Python math to retain sole authority over compliance decisions. The database change is being coordinated separately, so extraction must integrate through stable Pydantic models rather than migration-specific code.

This is a corroboration and fallback design, not a trained ensemble. It runs the least expensive/private extractor that can support a fact and escalates only unresolved fields.

## Goals / Non-Goals

**Goals:**

- Use one evidence-bearing Pydantic schema for deterministic and model extractors.
- Prefer local processing and avoid unnecessary remote document disclosure.
- Reject unsupported or schema-invalid model output.
- Preserve provider/model/schema provenance and measurable evaluation results.
- Degrade to deterministic extraction and review flags when providers are unavailable.

**Non-Goals:**

- Allowing a model to calculate thresholds or select patrol status.
- Training, fine-tuning, or majority-vote ensemble learning.
- Sending every document to every configured provider.
- Making Ollama on a developer laptop reachable from a cloud deployment.
- Treating model agreement as proof that a value is correct.

## Decisions

### Decision 1: One Candidate Fact Schema

Every extractor returns candidate facts containing field name, raw value, normalized value and unit, page, raw excerpt, evidence rectangle when available, extractor, provider, model, schema version, and validation signals. Pydantic validates provider output before it can enter the patrol pipeline.

**Alternative considered:** Provider-specific response models. Rejected because translation layers would drift and weaken contract tests.

### Decision 2: Local-First Escalation

The orchestration order is:

1. PyMuPDF and deterministic parsing.
2. Configured Ollama model for required fields still unresolved.
3. At most one configured remote provider for unresolved fields or material disagreement.
4. Pydantic validation, unit normalization, and evidence verification.
5. Human-review flag for unresolved disagreement.

The initial local model is configurable, with Mistral 7B Instruct treated as a benchmark candidate rather than a fixed winner.

**Alternative considered:** Call all providers and vote. Rejected because it increases latency, cost, disclosure, and correlated-error risk without creating trustworthy ground truth.

### Decision 3: Evidence Beats Agreement

A candidate is eligible only when its raw value can be tied to source evidence or an explicitly supported document-level field. Agreement can raise a quality signal but cannot replace evidence. Missing evidence remains missing.

### Decision 4: Remote Providers Are Optional and Explicit

Gemini and Claude integrations are disabled unless their server-side credentials and project policy are configured. The frontend never receives provider credentials. Remote requests send only the minimum required content and record which provider processed it.

Development can use local Ollama at `OLLAMA_BASE_URL`. A cloud backend requires a separately reachable Ollama service; it cannot use a teammate's laptop implicitly.

### Decision 5: Fail Closed for Compliance, Degrade Gracefully for Extraction

Provider timeout, invalid JSON, rate limit, or unavailable Ollama does not fail the entire deterministic pipeline. The affected facts remain unresolved and the relevant patrol returns `FLAG`. No provider failure can become a default value or `PASS`.

### Decision 6: Evaluation Before Model Selection

A small labeled fixture set covers native-text PDFs, alternative wording, missing fields, incompatible units, and adversarial instructions inside documents. The harness reports:

- exact and tolerance-based field accuracy;
- unit and functional-unit accuracy;
- unsupported-value invention rate;
- evidence-region support rate;
- disagreement and unresolved-field rates;
- latency by stage;
- remote request count and estimated cost.

Model choice and escalation thresholds are configuration informed by these results.

## Risks / Trade-offs

- **[Risk] Prompt injection inside vendor PDFs** → Treat document text as untrusted data, use schema-constrained extraction, disable tools, and never place model output directly into a decision or query.
- **[Risk] Confidential bid content reaches a remote provider** → Keep remote processing disabled by default, require deployment/project authorization, minimize content, and record disclosure provenance.
- **[Risk] Small local models invent plausible values** → Require evidence support, validate units, measure unsupported-value invention, and flag unresolved facts.
- **[Risk] Local inference is slow or unavailable in cloud hosting** → Apply deadlines and use deterministic fallback; deploy Ollama separately only after measured need.
- **[Risk] Provider schemas differ** → Use the shared Pydantic JSON Schema and provider contract tests.
- **[Risk] Agreement creates false confidence** → Treat agreement as a signal only and retain evidence plus human-review paths.

## Migration Plan

1. Establish the shared candidate-fact schema and deterministic extractor baseline.
2. Add Ollama behind disabled-by-default configuration and evaluate one pinned model.
3. Add one remote provider only after privacy approval and evaluation fixtures exist.
4. Add the second remote provider only if the first fails a documented availability, quality, or cost requirement.
5. Enable provider escalation in staging, compare against labeled fixtures, and retain a configuration switch to return to deterministic-only extraction.

## Open Questions

- Which bid documents, if any, may be sent to Gemini or Claude under the hackathon's data policy?
- Which hardware will run Ollama during the demonstration and what measured request deadline is acceptable?
- Which remote provider should be implemented first after evaluation: Gemini or Claude?
