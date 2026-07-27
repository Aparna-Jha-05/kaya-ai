## Context

The current prototype already has a Next.js dashboard, a FastAPI service, local SQLite and filesystem persistence, deterministic patrol rules, PyMuPDF extraction, optional model-assisted extraction, typed frontend API calls, and pull-request CI. The competition risk is not a missing platform architecture; it is the gap between a working local checkout and a repeatable public demonstration.

The demo must preserve the project rule that models extract and explain while deterministic code decides. It must also remain useful when no model key is present, avoid real vendor data, and recover quickly from free-tier cold starts or an unhealthy deployment.

## Goals / Non-Goals

**Goals:**

- Make one current frontend/backend pair publicly accessible and verifiably integrated.
- Present a short, deterministic procurement story with clear PASS, FLAG, and FAIL evidence.
- Reuse the current API, repository, extraction, patrol, RFI, simulation, and activity paths.
- Turn network failures and empty data into actionable UI states rather than stalled screens.
- Establish a repeatable pre-demo gate, operator runbook, and backup walkthrough.
- Keep all public claims aligned with executed behavior.

**Non-Goals:**

- Completing Supabase, authentication, RLS, pgvector RAG, full CAD/BIM parsing, or immutable production audit storage.
- Deploying Ollama or adding OpenAI and Anthropic routing for the competition demo.
- Allowing any model to set constraints, calculate compliance, or change PASS, FLAG, FAIL, or lifecycle decisions.
- Building a general deployment platform, fixture framework, or browser-testing architecture.
- Using real bids, credentials, or private vendor documents in the demo.

## Decisions

### 1. Treat readiness as a thin acceptance layer

The change will reuse existing product endpoints and UI flows. It will add only the fixtures, failure states, evidence presentation, deployed checks, and documentation needed to prove them.

**Alternative considered:** finish every active OpenSpec before submission. This would add unrelated database and provider risk without improving the core judge story.

### 2. Make deterministic mode the guaranteed path

The public backend will start and complete the seeded and upload flows with remote extraction disabled. Gemini may be enabled only after the same deployed acceptance checks pass repeatedly; an unavailable or invalid model response must fall back to deterministic evidence and FLAG unsupported facts.

**Alternative considered:** require a cloud model for the demo. This makes availability, quota, credentials, and model behavior unnecessary single points of failure.

### 3. Seed three synthetic narrative fixtures idempotently

The existing seed path will create or update stable synthetic records for:

1. a complete compliant bid that can be recommended;
2. a bid with insufficient or uncertain evidence that requires review; and
3. the lowest-price bid with a deterministic hard constraint failure.

Stable identifiers and upsert behavior will prevent duplicates across deploy restarts. Fixture assertions will verify the expected recommendation and decisive patrol status. All fixture names and documents will be visibly labeled synthetic.

**Alternative considered:** rely on live uploads alone. Live extraction is useful as a demonstration step but is too variable to carry the primary narrative.

### 4. Use deployment configuration, not runtime branching, for integration

Vercel will receive the public FastAPI origin through `NEXT_PUBLIC_PO_LICE_API_URL`; FastAPI will allow the exact deployed frontend origin. The operator will verify frontend and backend deployment metadata against the intended Git revision before the demo. No browser-supplied API keys or model names will be accepted.

**Alternative considered:** proxy the full backend through Next.js. The current direct API client already exists, and a new proxy layer would duplicate routing and failure behavior.

### 5. Reuse existing API errors and local UI patterns

Every judge-facing data consumer will catch the current API client's normalized errors and render loading, empty, failure, and retry states. A short cold-start message may explain the first retry. This does not require a new state-management dependency.

**Alternative considered:** introduce a query/cache framework. The small prototype can handle these states with the patterns already used by its working screens.

### 6. Render evidence already present in the bid contract

The review workspace will display the deterministic rule, measured value, limit, source excerpt, page number, and available bounding-box or dimension annotation. Missing geometry will be shown as unavailable, never invented. Text-region annotation will be described accurately and not marketed as full CAD/BIM interpretation.

**Alternative considered:** add a new extraction or vision subsystem. The backend already returns sufficient provenance for the competition claim.

### 7. Add one standard-library deployed acceptance runner

A small script will accept public frontend and backend URLs and assert:

- the frontend is reachable without authentication;
- backend readiness succeeds;
- CORS accepts the configured frontend origin;
- the three seeded outcomes exist;
- a known synthetic PDF can be uploaded idempotently;
- the uploaded record, source, simulation, RFI draft/approval, reviewer action, and activity trail remain reachable.

The script will use existing fixtures and Python's installed HTTP stack or standard library rather than introduce a browser-test framework. A concise manual checklist will verify the visual path the script cannot judge.

**Alternative considered:** add a full Playwright suite. That is useful after the prototype, but it adds setup and maintenance beyond the final competition gate.

### 8. Use an explicit go/no-go checklist

The demo is ready only when CI is green, the current public deployment passes the acceptance runner, fixtures show all three outcomes, the visual checklist passes, model-free mode works, claims are audited, and the backup walkthrough is accessible. A failure blocks submission readiness until fixed or removed from the demo script.

## Risks / Trade-offs

- **Free-tier backend cold start** → Show a retry state, warm the service before judging, and keep seeded data independent of model calls.
- **Ephemeral demo storage** → Use idempotent bootstrap data, document the persistence lifecycle, and run the pre-demo gate after every restart or deployment.
- **Optional Gemini quota or schema failure** → Keep remote extraction off for the guaranteed path and degrade unsupported facts to FLAG.
- **Live PDF variation** → Use one checked-in synthetic fixture for the live step and lead with pre-seeded records.
- **Deployment revision drift** → Record and compare the frontend and backend deployment revisions during the gate.
- **Evidence geometry absent for a field** → Render the excerpt and page with an explicit “region unavailable” state.
- **Prototype controls are mistaken for production security** → Label the deployment as synthetic demo mode and do not upload real procurement documents.

## Migration Plan

1. Add and assert the three synthetic fixtures without changing existing user records outside demo mode.
2. Complete frontend error states and evidence rendering against the current API contract.
3. Add the deployed acceptance runner and manual visual checklist.
4. Deploy the backend with deterministic extraction, exact-origin CORS, and idempotent demo bootstrap.
5. configure and deploy the frontend with the public backend origin.
6. Run CI, the deployed acceptance runner, and the visual checklist; record the approved revisions.
7. Enable optional Gemini only if the same gate still passes, then capture the backup walkthrough.

Rollback is a deployment rollback to the last green revision. The deterministic fixture path remains the fallback if optional model extraction is disabled.

## Open Questions

- Which final Vercel and Render public URLs will be placed in the submission?
- Does the competition require a video file, an unlisted hosted link, or both?
