# PO-LICE Competition Operator Runbook

> **Project**: PO-LICE (Purchase Order Liability, Intelligence & Compliance Engine)
> **Track**: Track 3: Procurement — Kaya AI IIT India Hackathon 2026

---

## 1. Submission Target & Deployment Metadata

| Component | Target URL | Verified Source Revision | Access Control |
| --- | --- | --- | --- |
| **Frontend** | `https://po-lice.vercel.app` | `c7f7a2d` | Public HTTPS (no platform login required) |
| **Backend** | `https://po-lice-backend-staging.onrender.com` | `1940751` (latest backend/Render source change) | Public HTTPS (exact-origin CORS configured) |

### Environment Variables

#### Backend (`Render` / local):
- `PO_LICE_ALLOWED_ORIGINS`: Origin URL of frontend (e.g. `http://localhost:3000` or deployed Vercel domain)
- `PO_LICE_PROJECT_ID`: `PRJ-POLICE-01`
- `OLLAMA_ENABLED`: `false` (guaranteed deterministic path)
- `REMOTE_EXTRACTION_ENABLED`: `false` (or `true` with `GEMINI_API_KEY` for optional enhancement)
- `PO_LICE_DATA_DIR`: Data persistence directory (defaults to `backend/data/`)

#### Frontend (`Vercel` / local):
- `NEXT_PUBLIC_PO_LICE_API_URL`: Backend URL (e.g. `http://localhost:8000` or deployed Render domain)

---

## 2. Storage Lifecycle & Reseed Procedure

### Storage Model
- Uploaded PDF documents and metadata use local SQLite + filesystem storage in explicit demo mode.
- SQLite database location: `$PO_LICE_DATA_DIR/po_lice.sqlite3`.
- Source PDF location: `$PO_LICE_DATA_DIR/uploads/{bid_id}.pdf`.
- When FastAPI starts in demo mode (`DEMO_MODE=true`), `scripts/seed_demo_data.py` is automatically executed during startup to ensure the three narrative fixtures exist idempotently without manual intervention.

### Cold-Start Warm-Up & Bootstrap Procedure
If the backend instance is cold (asleep on free-tier Render hosting):
1. **Warm Up**: Ping `GET /api/v1/readiness` (allow up to 45 seconds if spinning up from cold).
2. **Verify Fixtures**: Startup automatically populates fixtures. To manually trigger reseed if needed:
   ```bash
   PYTHONPATH=backend python3 scripts/seed_demo_data.py
   ```
3. **Verify Deployed Acceptance Gate**:
   ```bash
   python3 scripts/acceptance_gate.py --backend <BACKEND_URL> --frontend <FRONTEND_URL>
   ```
   The gate removes its acceptance-only upload and related activity after verification so the three narrative fixtures remain clean.

---

## 3. Manual Visual Checklist

- [x] Dashboard Review Queue renders SummaryRow, ActiveBidsTable, and CaseFilesPanel without loading spinners.
- [x] ActiveBidsTable displays Trane (RECOMMENDED), Carrier (REVIEW_REQUIRED), CoolTech (REJECT with action needed).
- [x] Portfolio page allows filtering and selecting bids, rendering the TCO Comparison Bar Chart.
- [x] Bid Detail page displays vendor name, equipment model, recommendation badge, and tab strip.
- [x] Source tab displays extracted candidates, page numbers, and bounding-box / geometry status.
- [x] Checks tab allows clicking "Inspect evidence & geometry" to open the drawer.
- [x] RFI Modal opens, shows factual breach text, and allows human approval.
- [x] TCO Slider dynamically updates calculated 5-year cost without page refresh.
- [x] Audit log page displays recorded activity events and allows CSV export.

### Verification Evidence — 2026-07-28

- Main CI passed for frontend revision `c7f7a2d`: <https://github.com/Aparna-Jha-05/kaya-ai/actions/runs/30329660670>
- Public deployed acceptance passed 11/11 checks against the Vercel and Render URLs above.
- The acceptance-only upload was removed successfully; the live dataset returned to the three narrative fixtures.
- Browser verification found no console errors and confirmed the truthful architecture copy, neutral TCO card, evidence drawer, readable integrity evidence, RFI modal, and activity export control.

### Verification Evidence — 2026-07-30 Refresh

- Pull-request and post-merge CI passed OpenSpec, backend, PostgreSQL foundation, extraction baseline, API contract, and frontend build checks for the competition README update: <https://github.com/Aparna-Jha-05/kaya-ai/actions/runs/30530393835>
- The public deployed acceptance gate passed 11/11 checks against the Vercel and Render URLs above and removed its acceptance-only upload.
- Browser verification moved the Trane upfront discount from 0% to 18%; the visible scenario changed from ₹6.96 Cr to ₹6.20 Cr without a page reload.
- The runtime revisions in the deployment table remain the served application revisions because the subsequent README-only deployment was intentionally skipped by Vercel's ignored-build rule.

### Go/No-Go Decision — 2026-07-30

**GO for the synthetic competition prototype.** CI, public access, deployed
acceptance, visual behavior, fixture assertions, deterministic fallback, and
claim review have evidence. Supabase runtime persistence, authentication/RLS,
durable RAG/audit storage, and configurable OpenAI/Anthropic routing remain
production-roadmap work and are not part of the demo-ready claim.

---

## 4. Honest Capability Matrix

| Capability | Status | Implementation Detail |
| --- | --- | --- |
| Next.js 14 Dashboard | **Implemented** | Full UI connected via `lib/api.ts` |
| FastAPI Backend | **Implemented** | 15+ REST endpoints in `backend/main.py` |
| PyMuPDF Extraction | **Implemented** | Text, unit normalization, page geometry |
| 4 Deterministic Patrols | **Implemented** | Building, Green, Vice Squad, Traffic Control |
| SQLite Persistence | **Implemented** | WAL mode, optimistic concurrency, RFI drafts |
| Human Decision Audit | **Implemented** | Optimistic concurrency (`expected_version`) |
| Scenario Simulation | **Implemented** | Bounded TCO² calculation service |
| PostgreSQL / pgvector | *Planned Foundation* | Migrations & seeder verified; runtime CRUD planned |
| Authentication / RLS | *Planned* | Explicit role design; auth middleware planned |
| Live Vendor RAG | *Planned* | Vector search schema specified; HTTP wiring planned |
| CAD/BIM Full Parsing | *Planned* | Text region / dimension annotation parsing; full 3D CAD planned |

---

## 5. Deterministic Fallback & Deployment Rollback

### Deterministic Fallback
If optional Gemini AI extraction experiences network timeout or quota errors:
- The system automatically falls back to deterministic PyMuPDF extraction.
- Unresolved missing facts produce `FLAG` in Building/Green patrols.
- Compliance recommendations never crash or guess missing values.

### Rollback Steps
If a deployment fails the acceptance gate:
1. Revert deployment to the previous green git commit on `main`.
2. Re-run `python3 scripts/seed_demo_data.py`.
3. Re-verify using `python3 scripts/acceptance_gate.py`.
