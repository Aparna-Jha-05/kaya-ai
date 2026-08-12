# PO-LICE Competition Operator Runbook

> **Project**: PO-LICE (Purchase Order Liability, Intelligence & Compliance Engine)
> **Track**: Track 3: Procurement — Kaya AI IIT India Hackathon 2026

---

## 1. Submission Target & Deployment Metadata

| Component | Target URL | Verified Source Revision | Access Control |
| --- | --- | --- | --- |
| **Frontend** | `https://kaya-ai-police.vercel.app` | `a3feef9` | Public HTTPS (no platform login required) |
| **Backend** | `https://po-lice-backend-staging-qiix.onrender.com` | `1940751` (latest backend/Render source change) | Public HTTPS (exact-origin CORS configured) |

### Environment Variables

#### Backend (`Render` / local):
- `PO_LICE_ALLOWED_ORIGINS`: Origin URL of frontend (e.g. `http://localhost:3000` or deployed Vercel domain)
- `PO_LICE_PROJECT_ID`: `PRJ-POLICE-01`
- `OLLAMA_ENABLED`: `false` (guaranteed deterministic path)
- `REMOTE_EXTRACTION_ENABLED`: `false` (or `true` with `GEMINI_API_KEY` for optional enhancement)
- `PO_LICE_DATA_DIR`: Data persistence directory (defaults to `backend/data/`)
- `MINIO_ENDPOINT`, `SUPABASE_STORAGE_URL`: (Optional) Activates Stage S1 3-Tier Storage Cascade.
- `JARVIS_HANDOFF_URL`, `JARVIS_SECRET`: (Optional) Activates external Jarvis webhook delegation.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: (Optional) Activates live SMTP RFI dispatch.

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

### Verification Evidence — 2026-08-12 Refresh

- Pull-request and post-merge CI passed OpenSpec, backend, PostgreSQL foundation, extraction baseline, API contract, and frontend build checks.
- The public deployed acceptance gate passed 11/11 checks against the Vercel and Render URLs above and removed its acceptance-only upload.
- Browser verification confirmed hardware-accelerated transitions across interactive components, natural responsive table scrolling, and dynamic layout updates without page reloads.
- The runtime revisions in the deployment table have been updated to reflect the latest UI/UX frontend enhancements.

### Go/No-Go Decision — 2026-08-12

**GO for the synthetic competition prototype.** CI, public access, deployed
acceptance, visual behavior, fixture assertions, deterministic fallback, and
claim review have evidence. Configurable OpenAI/Anthropic routing remains
production-roadmap work and is not part of the demo-ready claim.

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
| Multi-Tier Storage Cascade | **Implemented** | Environment-driven Local -> MinIO -> Supabase S3 |
| Live SMTP RFI Dispatch | **Implemented** | Outbound queue with exponential backoff |
| Jarvis Agent Handoff | **Implemented** | External webhook delegation with HMAC-SHA256 |
| PostgreSQL / pgvector | **Implemented** | HNSW 1536-dim vector similarity search & SQL migrations |
| Authentication / RLS | **Implemented** | JWT Bearer token verification & PostgreSQL RLS policies |
| Live Vendor RAG | **Implemented** | Powered by pgvector Vendor Memory for Vice Squad patrol |
| CAD/BIM Intelligence | **Implemented** | Spatial vector callout parsing (`WIDTH_M`, `LENGTH_M`) |
| OCR & Table Extraction | **Implemented** | Tesseract -> EasyOCR -> PyMuPDF and pdfplumber -> Camelot cascade |
| Dual SLM Cascade | **Implemented** | Ollama Mistral 7B -> Llama 3.1 8B -> Remote Gemini Flash fallback |
| Redis Cache | **Implemented** | L1 In-Memory TTL -> L2 Redis Cluster caching |
| External Integrations | **Implemented** | Amber Project Graph API and MCP Planner™ API connected |

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
