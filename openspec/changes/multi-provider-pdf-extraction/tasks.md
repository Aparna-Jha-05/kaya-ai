## 1. Evaluation Baseline

- [x] 1.1 Create labeled synthetic or redistributable PDFs covering supported fields, missing fields, unit variants, and embedded prompt injection
- [x] 1.2 Add deterministic baseline metrics for field accuracy, units, unsupported-value invention, evidence support, and latency
- [x] 1.3 Record the demonstration hardware and extraction request deadline

## 2. Shared Extraction Contract

- [x] 2.1 Extend Pydantic models with candidate value, normalized unit, evidence, extractor, provider, model, and schema provenance
- [x] 2.2 Add validation that rejects incompatible units, missing required provenance, and schema-invalid provider output
- [x] 2.3 Add deterministic comparison rules for equivalent and materially disagreeing candidates

## 3. Local Ollama Extraction

- [x] 3.1 Add validated `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, deadline, and disabled-state settings
- [x] 3.2 Implement schema-constrained Ollama extraction for unresolved required fields without tool access
- [x] 3.3 Bind model candidates to source evidence and reject unsupported values
- [ ] 3.4 Evaluate pinned Mistral 7B Instruct and at least one feasible local alternative before selecting the default

## 4. Optional Remote Fallback

- [x] 4.1 Add a project-level remote-processing authorization check and disclosure audit record
- [x] 4.2 Implement one remote structured-output provider selected from Gemini or Claude
- [x] 4.3 Send only unresolved evidence regions or minimum required text and enforce bounded timeouts and retries
- [x] 4.4 Verify that credentials remain server-side and are absent from responses, logs, fixtures, and frontend bundles
- [ ] 4.5 Add the second remote provider only if evaluation demonstrates a documented gap in the first

## 5. Cascade and Patrol Integration

- [x] 5.1 Run deterministic parsing first and skip all models when required facts are complete
- [x] 5.2 Run Ollama only for unresolved fields and remote fallback only when authorized and still required
- [x] 5.3 Preserve all candidates on disagreement and emit a human-review flag
- [x] 5.4 Verify provider verdicts never enter deterministic patrol status or lifecycle decisions
- [x] 5.5 Return unresolved facts and provider failures without guessing default values

## 6. Verification and Rollout

- [x] 6.1 Add contract tests for each provider using recorded or stubbed structured responses
- [ ] 6.2 Run the labeled evaluation and publish the chosen configuration's metrics
- [ ] 6.3 Enable the cascade in staging behind configuration and verify deterministic-only rollback
- [x] 6.4 Document local Ollama startup, cloud Ollama limitations, remote data policy, and secret setup
