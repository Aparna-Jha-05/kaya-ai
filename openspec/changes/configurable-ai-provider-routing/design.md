## Context

The current FastAPI extraction flow always runs deterministic PyMuPDF/regex parsing, optionally tries local Ollama, and then optionally calls Gemini for unresolved fields. All accepted model candidates already pass through one Pydantic schema, exact-source checking, and server-side unit normalization before deterministic patrol code sees them.

Gemini has been exercised successfully, but the current settings and cascade are Gemini-specific. The frontend also has no safe API for discovering which extraction choices a deployment can use. This change extends the in-progress `multi-provider-pdf-extraction` work without replacing its candidate schema, privacy checks, evaluation fixtures, or deterministic decision boundary.

## Goals / Non-Goals

**Goals:**

- Make Gemini, OpenAI, Anthropic, and Ollama selectable without duplicating validation or patrol logic.
- Preserve deterministic-first extraction and a deterministic-only mode.
- Keep provider model identifiers and credentials under backend deployment control.
- Give the frontend a stable, secret-free provider capability contract.
- Keep automatic routing bounded to one remote disclosure per upload.
- Require measured evaluation before changing the automatic provider order or deployment default.

**Non-Goals:**

- Supporting every model identifier a browser sends.
- Calling every provider, majority voting, or treating agreement as ground truth.
- Training, fine-tuning, or hosting a model as part of this change.
- Moving patrol thresholds, calculations, or `PASS` / `FAIL` / `FLAG` authority into a model.
- Solving database persistence, authentication, or deployment hosting in this change.
- Adding provider SDK dependencies when the existing bounded JSON transport is sufficient.

## Decisions

### Decision 1: Separate requested mode from actual provider provenance

Add an extraction request mode with `auto`, `deterministic`, `ollama`, `gemini`, `openai`, and `anthropic`. Keep `ExtractionProvider` for extractors that actually ran, adding only `openai` and `anthropic`; `auto` is not provenance.

The upload endpoint accepts an optional multipart `extraction_mode` that defaults to `auto`, preserving existing clients. An unavailable or unknown explicit mode is rejected before remote disclosure. A provider that becomes unavailable during extraction produces a bounded extraction issue and unresolved facts rather than failing open.

**Alternative considered:** Reuse `ExtractionProvider` and add `auto`. Rejected because audit records must name the actual extractor rather than a routing instruction.

### Decision 2: Keep model selection server-side

Use one configured model identifier per provider:

- `OLLAMA_MODEL`
- `GEMINI_MODEL`
- `OPENAI_MODEL`
- `ANTHROPIC_MODEL`

Remote credentials remain optional server secrets. The browser may select a provider mode reported by the backend but cannot supply a model identifier, endpoint, key, or provider order.

**Alternative considered:** Let the frontend submit arbitrary model names. Rejected because provider models differ in structured-output support, operators cannot evaluate an unbounded set, and arbitrary identifiers weaken reproducibility.

### Decision 3: Extend the existing cascade with the smallest provider map

Reuse the existing prompt, `ProviderExtractionResponse`, `_provider_candidates`, evidence validation, unit normalization, minimum remote context, timeout, and JSON transport. Add OpenAI and Anthropic adapters only for provider-specific request and response envelopes.

The cascade resolves a request as follows:

1. Always run deterministic parsing.
2. Stop immediately for `deterministic` mode or when all configured fields are resolved.
3. In explicit mode, try only the selected provider.
4. In `auto`, try enabled local Ollama first, then select the first configured provider from `REMOTE_EXTRACTION_PROVIDER_ORDER`.
5. Stop after one remote provider attempt, even when that attempt fails.
6. Validate and normalize candidates on the server; leave unsupported or disputed facts unresolved.

The remote order defaults to `gemini` so existing deployments retain their behavior. It contains only `gemini`, `openai`, and `anthropic`, rejects duplicates and unknown values, and does not make a provider available unless its key and model are configured.

**Alternative considered:** Introduce a provider framework, dependency-injection container, or retry graph. Rejected because the current service needs only a small validated map from provider enum to extractor.

### Decision 4: Add a secret-free capability endpoint

Add `GET /api/v1/extraction/providers`. Its response contains the default mode and provider entries with only:

- provider identifier;
- whether it is available in this deployment;
- whether it is remote;
- configured model identifier when available.

It never returns credentials, secret headers, environment values, or remote project authorization lists. The frontend uses this response to show enabled choices and submits only `extraction_mode`.

**Alternative considered:** Duplicate provider lists in TypeScript. Rejected because frontend and backend availability would drift.

### Decision 5: Preserve disclosure authorization and audit per actual attempt

Every remote attempt still requires global remote enablement and authorization for the resolved project. The disclosure record names the actual provider, configured model, requested fields, and timestamp. Explicit selection does not override privacy authorization.

A manually selected second provider therefore requires a new user request; the backend does not silently disclose the same document to another vendor after a runtime failure.

**Alternative considered:** Automatically fail over across all configured remote providers. Rejected because one upload could create unexpected multiple disclosures, costs, and inconsistent audit expectations.

### Decision 6: Evaluation gates defaults, not basic adapter availability

Unit tests use stubbed transport responses to verify provider envelopes, structured response validation, secret handling, selection, and failure isolation. The existing labeled fixture harness runs each configured provider/model separately and records the existing accuracy, evidence, latency, request-count, and cost metrics.

A provider adapter may be configured explicitly for development, but a provider/model may enter `REMOTE_EXTRACTION_PROVIDER_ORDER` in staging or production only with a checked-in evaluation result and successful deterministic-only rollback check.

**Alternative considered:** Treat one live smoke request as provider qualification. Rejected because a successful request does not measure unsupported-value invention or field accuracy.

## Risks / Trade-offs

- **[Risk] Provider structured-output dialects differ** → Keep provider-specific schema translation inside each adapter and validate every response again with the full Pydantic model.
- **[Risk] A configured model stops supporting the required schema** → Pin model identifiers, record bounded provider errors, and retain deterministic-only rollback.
- **[Risk] Provider choice leaks credentials or policy** → Return only safe capability fields and test serialized settings, API responses, logs, and frontend bundles for secret absence.
- **[Risk] Explicit selection bypasses remote policy** → Apply project authorization after mode resolution and before creating any remote request.
- **[Risk] Automatic order hides quality differences** → Require per-provider labeled metrics before changing the deployed order.
- **[Trade-off] One remote attempt may leave facts unresolved during an outage** → Preserve predictable disclosure and cost; a reviewer may explicitly retry with another available provider.

## Migration Plan

1. Add request/configuration models and secret-free provider discovery without changing the existing default cascade.
2. Refactor Gemini authorization into provider-aware checks while keeping Gemini as the only default remote provider.
3. Add and contract-test the OpenAI adapter, then run the labeled evaluation.
4. Add and contract-test the Anthropic adapter, then run the same evaluation.
5. Extend the upload contract and frontend client to use backend-reported provider modes.
6. Enable evaluated providers in staging, verify disclosure audit records and frontend compatibility, then verify `deterministic` mode with all remote providers disabled.
7. Promote a provider order only after evaluation evidence is reviewed. Roll back by setting the request/default mode to `deterministic` or disabling remote extraction.

## Open Questions

- Which provider/model evaluation thresholds are sufficient for staging promotion beyond the existing metric report?
- Should a later authenticated project setting choose the default provider, or is deployment-level order sufficient for the prototype?
- Which bid-document classifications are permitted for each remote provider under the project data policy?
