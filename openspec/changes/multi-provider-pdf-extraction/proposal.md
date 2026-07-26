## Why

PO-lice needs stronger extraction from varied vendor PDFs without allowing a language model to decide engineering compliance. A local-first, provider-neutral extraction path lets the team work independently of database migrations while preserving an optional cloud fallback for difficult documents.

## What Changes

- Add a shared Pydantic fact schema for deterministic parsing, Ollama, Gemini, and Claude structured outputs.
- Use PyMuPDF and deterministic parsing first, then Ollama for unresolved extraction fields.
- Call at most one configured remote provider only when required facts remain unsupported or extractors materially disagree.
- Preserve raw evidence, provider, model, prompt/schema version, latency, and validation results for every candidate fact.
- Validate units and evidence before accepting a candidate; unresolved disagreement becomes `FLAG` for human review.
- Add a labeled evaluation harness for field accuracy, unit accuracy, unsupported-value invention, disagreement, latency, and remote cost.
- Keep all compliance thresholds, patrol statuses, and lifecycle decisions outside model control.

## Capabilities

### New Capabilities

- `multi-provider-pdf-extraction`: Local-first structured fact extraction, optional remote corroboration, evidence-bound validation, provider security, and measurable evaluation.

### Modified Capabilities

(None)

## Impact

- **Backend**: Adds provider-neutral extraction orchestration, provider clients, settings, provenance fields, and evaluation fixtures.
- **Models**: Reuses one Pydantic schema and JSON Schema across every provider.
- **Operations**: Supports `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, optional `GEMINI_API_KEY`, and optional `ANTHROPIC_API_KEY`; secrets remain server-side.
- **Privacy**: Remote document processing is disabled unless explicitly configured for the deployment and permitted for the project.
- **Patrols**: No change to deterministic patrol decision authority.
