## 1. Provider Contract and Configuration

- [ ] 1.1 Add request-mode and provider-capability Pydantic models, and extend actual provider provenance with OpenAI and Anthropic
- [ ] 1.2 Extend extraction settings with OpenAI and Anthropic credentials/models plus validated `REMOTE_EXTRACTION_PROVIDER_ORDER`
- [ ] 1.3 Add provider availability and project-authorization helpers without exposing secrets in representations or serialized responses
- [ ] 1.4 Add assertion-based tests for valid, incomplete, duplicate, and unknown provider configuration

## 2. Structured Provider Adapters

- [ ] 2.1 Implement the OpenAI structured-output adapter using the existing prompt, timeout, JSON transport, and shared response contract
- [ ] 2.2 Implement the Anthropic structured-output adapter using the existing prompt, timeout, JSON transport, and shared response contract
- [ ] 2.3 Add stubbed contract tests for both provider request envelopes, response parsing, provenance, invalid responses, and secret-safe failures

## 3. Deterministic-First Routing

- [ ] 3.1 Pass the requested extraction mode from PDF extraction into the cascade while preserving `auto` as the default
- [ ] 3.2 Replace Gemini-specific remote routing with the validated provider map and first-available automatic selection
- [ ] 3.3 Preserve minimum-context disclosure and write provider-aware disclosure records for every actual remote attempt
- [ ] 3.4 Add cascade tests for deterministic-only, explicit provider, local-first auto, unavailable selection, unauthorized remote use, runtime failure, and the one-remote-attempt limit
- [ ] 3.5 Assert that equivalent validated facts produce provider-independent deterministic patrol results and missing or disputed facts never silently pass

## 4. Backend and Frontend API Contract

- [ ] 4.1 Add `GET /api/v1/extraction/providers` with the secret-free capability response
- [ ] 4.2 Add optional multipart `extraction_mode` handling to the bid upload endpoint with validation before remote disclosure
- [ ] 4.3 Add API tests for backward-compatible uploads, explicit selection, unavailable selection, capability discovery, and credential absence
- [ ] 4.4 Extend `lib/api.ts` with shared provider types, capability discovery, and optional upload-mode submission
- [ ] 4.5 Add a frontend provider selector that renders only backend-reported choices and defaults to `auto`

## 5. Evaluation and Documentation

- [ ] 5.1 Extend the labeled evaluation runner to execute a selected configured provider/model and record model identity, accuracy, evidence, latency, request count, and estimated cost
- [ ] 5.2 Run and publish the Gemini configuration as the comparison baseline
- [ ] 5.3 Run and publish OpenAI metrics before adding OpenAI to the deployed automatic order
- [ ] 5.4 Run and publish Anthropic metrics before adding Anthropic to the deployed automatic order
- [ ] 5.5 Select and document the staging provider order from measured results without enabling multi-provider voting
- [ ] 5.6 Update environment and deployment documentation for optional provider keys/models, backend-only secret placement, and deterministic rollback

## 6. Verification and Staging Rollout

- [ ] 6.1 Run backend assertion-based tests and the deterministic extraction evaluation without live provider credentials
- [ ] 6.2 Validate all active OpenSpec changes strictly and run the frontend production build
- [ ] 6.3 Configure evaluated provider secrets only in the backend staging environment and verify the Vercel frontend capability/upload flow
- [ ] 6.4 Verify one live extraction per enabled provider without logging document content or credentials
- [ ] 6.5 Disable remote extraction, select deterministic mode, and verify the complete upload and patrol flow still works
