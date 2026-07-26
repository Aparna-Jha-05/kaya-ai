## Why

The extraction prototype now works with Gemini, but provider availability, quotas, cost, and document quality can vary during development and demonstrations. PO-lice needs a safe way to select among Gemini, OpenAI, Anthropic, and local Ollama without changing the evidence contract or giving any model authority over compliance decisions.

## What Changes

- Add backend-owned provider discovery and selection for `deterministic`, `auto`, `ollama`, `gemini`, `openai`, and `anthropic` modes.
- Keep one configurable model identifier per provider while advertising only configured and evaluated combinations as supported.
- Extend the existing extraction cascade with OpenAI and Anthropic structured-output adapters that return the shared Pydantic candidate schema.
- In `auto` mode, use an explicit server-side provider order and stop after the first authorized remote provider attempt; do not call every provider or vote across models.
- Allow the upload API to request an available provider without exposing credentials or accepting arbitrary browser-supplied model identifiers.
- Preserve project-level remote-processing authorization, minimum-context disclosure, bounded failures, evidence validation, and deterministic-only rollback.
- Require the same labeled evaluation report before a provider/model combination can become the default.

## Capabilities

### New Capabilities

- `configurable-ai-provider-routing`: Safe provider discovery, selection, structured adapters, fallback behavior, and evaluation gates across local and remote extraction providers.

### Modified Capabilities

(None)

## Impact

- **Backend configuration**: Adds optional `OPENAI_API_KEY`, `OPENAI_MODEL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, and a validated remote-provider order while reusing existing Gemini, Ollama, timeout, project authorization, and remote enablement settings.
- **Backend API**: Adds a secret-free provider-capability response and an optional provider preference on bid upload.
- **Extraction service**: Extends the current cascade and shared candidate validation; patrol rules and lifecycle decisions remain unchanged.
- **Frontend contract**: May display only providers reported as available and send a provider identifier, never a key or arbitrary model name.
- **Verification**: Extends provider contract tests and the existing labeled extraction evaluation; live API checks remain opt-in.
