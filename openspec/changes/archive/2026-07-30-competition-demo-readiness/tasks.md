## 1. Freeze the competition target

- [x] 1.1 Record the final public Vercel frontend URL, Render backend URL, intended Git revision, and deployment access settings in the demo runbook.
- [x] 1.2 Configure `NEXT_PUBLIC_PO_LICE_API_URL` and the exact `PO_LICE_ALLOWED_ORIGINS` value, then verify that neither public endpoint requires a platform login.
- [x] 1.3 Document the demo storage lifecycle and the safe bootstrap/reseed procedure used after a restart or deployment.

## 2. Build the deterministic narrative fixtures

- [x] 2.1 Extend the existing demo seed path with stable, visibly synthetic fixtures for RECOMMENDED, REVIEW_REQUIRED, and REJECT outcomes.
- [x] 2.2 Make the rejected fixture the lowest-price bid and give it a cited deterministic hard constraint failure.
- [x] 2.3 Add assertion-based tests proving fixture idempotency, unique stable identifiers, expected recommendations, decisive patrol statuses, and synthetic labels.
- [x] 2.4 Add one safe synthetic PDF fixture whose deterministic upload result is asserted and suitable for the live demo.

## 3. Make judge-facing screens recoverable

- [x] 3.1 Add bounded error and retry states to the dashboard summary, active bids, case files, and bid portfolio consumers.
- [x] 3.2 Verify upload, bid detail, activity, comparison, and scenario views each distinguish loading, empty, API failure, and successful data without silent mock fallback.
- [x] 3.3 Add the smallest component-level or executable checks that prove a failed request exits loading and a retry can render current API data.

## 4. Show evidence behind the decision

- [x] 4.1 Render the decisive patrol status, rule, measured value, constraint limit, source excerpt, and page in the bid review workspace.
- [x] 4.2 Render validated bounding-box or dimension annotation details when present and an explicit region-unavailable state otherwise.
- [x] 4.3 Add checks proving unsupported evidence remains FLAG and the UI never invents a value, page, or geometry.
- [x] 4.4 Audit UI wording so detected PDF text regions and dimension annotations are not described as full CAD or BIM interpretation.

## 5. Prove the model-independent path

- [x] 5.1 Run an assertion-based known-PDF workflow with all remote extraction disabled and verify readiness, upload, deterministic patrols, RFI review, simulation, reviewer action, and activity.
- [x] 5.2 Add or update the optional Gemini failure check so timeout, quota, and invalid structured output fall back to deterministic evidence with unresolved facts flagged.
- [x] 5.3 Inspect the production frontend bundle, requests, logs, fixtures, and tracked files for provider keys, credentials, or private vendor content.

## 6. Add the deployed acceptance gate

- [x] 6.1 Add one parameterized deployed acceptance command that checks public frontend reachability, backend readiness, exact-origin CORS, the three seeded outcomes, idempotent known-PDF upload, source retrieval, simulation, RFI approval, reviewer action, and activity retrieval.
- [x] 6.2 Make every acceptance check assertion-based, non-zero on failure, and safe for logs by excluding secrets and document contents.
- [x] 6.3 Run pull-request CI, the deployed acceptance command, and the concise manual visual checklist against the exact submitted revisions and record the results.

## 7. Prepare the operator and submission material

- [x] 7.2 Document cold-start warm-up, retry, reseed, deterministic fallback, and deployment rollback steps.
- [x] 7.3 Audit README, architecture, slides, and narration to label implemented, optional, and planned capabilities accurately and to identify all demo data as synthetic.

## 8. Make the final decision

- [x] 8.1 Complete the go/no-go checklist for CI, deployed acceptance, visual behavior, fixture assertions, deterministic fallback, claim review, and public access.
- [x] 8.2 Mark the competition prototype demo-ready only after every repository-controlled gate has evidence; production-roadmap capabilities remain explicitly planned.
