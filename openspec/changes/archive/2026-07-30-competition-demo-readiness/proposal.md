## Why

PO-lice has a credible local prototype, but a competition judge needs a current, public, repeatable path that cannot be blocked by deployment drift, missing model credentials, weak demo data, or an endless loading state. The final readiness change should prove the existing product story without expanding into unfinished production architecture.

## What Changes

- Define a public demo gate covering the deployed frontend, backend readiness, API routing, CORS, and the exact source revision under review.
- Provide an idempotent synthetic demo dataset with a compliant bid, a review-required bid, and a lower-cost hard failure so the deterministic compliance value is immediately visible.
- Require explicit loading, empty, offline, and retry states for every judge-facing data view.
- Surface source evidence and deterministic rule inputs in the review workspace, including page, excerpt, and available geometry or dimension annotations.
- Keep the demo functional with deterministic extraction alone; optional Gemini extraction may improve supported facts but may not control or block compliance decisions.
- Add one deployed end-to-end acceptance check and a short operator runbook with a reset procedure.
- Audit submission copy so implemented, optional, and planned capabilities are clearly distinguished.

## Capabilities

### New Capabilities

- `competition-demo-readiness`: A repeatable, publicly accessible, evidence-led competition demo with deterministic fixtures, graceful failure behavior, deployment verification, and an explicit go/no-go gate.

### Modified Capabilities

(None)

## Impact

- **Frontend**: Judge-facing dashboard, portfolio, case-file, upload, comparison, review, RFI, scenario, and activity flows.
- **Backend**: Existing readiness, bid, upload, review, simulation, RFI, and activity APIs; no new model authority or production database requirement.
- **Demo data**: Synthetic fixtures and an idempotent reset/bootstrap path that never contains real vendor material.
- **Deployment**: Vercel frontend configuration, Render backend configuration, exact-origin CORS, environment documentation, and deployed revision checks.
- **Verification**: CI remains the pull-request baseline; a separate deployed smoke gate verifies the actual public frontend/backend pair before submission.
- **Documentation**: README and a concise competition runbook describing the supported demo, limitations, recovery steps, and honest claims.
