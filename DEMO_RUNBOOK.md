# PO-LICE Competition Operator Runbook & Demo Script

> **Project**: PO-LICE (Purchase Order Liability, Intelligence & Compliance Engine)
> **Track**: Track 3: Procurement — Kaya AI IIT India Hackathon 2026

---

## 1. Submission Target & Deployment Metadata

| Component | Target URL | Submitted Revision | Access Control |
| --- | --- | --- | --- |
| **Frontend** | `https://po-lice.vercel.app` | `main` frontend revision (`f3267df`) | Public HTTPS (no platform login required) |
| **Backend** | `https://po-lice-backend-staging.onrender.com` | `main` branch HEAD (`1940751`) | Public HTTPS (exact-origin CORS configured) |

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

## 3. Timed 3-Minute Competition Demo Script

```text
⏱️ 0:00 - 0:30 | THE PROBLEM & DASHBOARD OVERVIEW
  1. Open the dashboard (Review Queue page).
  2. Point out the summary metrics: Submitted Bids, Hard-Limit Failures, Documents Missing.
  3. Explain: "In high-value engineering procurement, cost alone is misleading. Hard constraints must be enforced deterministically."

⏱️ 0:30 - 1:15 | CHEAPEST BID HARD FAILURE (CoolTech)
  1. Click on "Compare submitted bids" to view the Bid Portfolio.
  2. Show that CoolTech Global is the LOWEST PRICE bid (INR 3.80 Cr).
  3. Open CoolTech review docket.
  4. Point out the REJECT recommendation and hard constraint breaches:
     - Building Patrol FAIL: Substation Power Draw 1,400 kW > 1,200 kW limit
     - Green Patrol FAIL: Embodied Carbon 540 kgCO2e/ton > 450 kgCO2e cap
  5. Show "Downstream Impact" graph showing engineering and carbon consequences.

⏱️ 1:15 - 1:50 | EVIDENCE & HUMAN RFI WORKFLOW
  1. Open the "Checks" and "Source data" tabs.
  2. Inspect the cited source excerpt, page location, and bounding box geometry.
  3. Open the RFI Modal ("Safety certificate needed").
  4. Click "Approve RFI Draft" to confirm officer approval (persisted as separate action).

⏱️ 1:50 - 2:30 | COMPLIANT BID & TOTAL COST SCENARIO
  1. Return to comparison and select Trane Solutions (INR 4.20 Cr, RECOMMENDED).
  2. Adjust the TCO Slider (Upfront Discount / Delay Penalty).
  3. Show the real-time recalculation of the 5-Year Risk-Adjusted Cost (TCO²).
  4. Click "Record ready for decision" to log the reviewer decision.

⏱️ 2:30 - 3:00 | LIVE UPLOAD & AUDIT TRAIL
  1. Navigate to "Upload bid" and upload `scripts/fixtures/DemoUpload_SyntheticBid.pdf`.
  2. Show deterministic parsing extracting Acme HVAC specs and running patrols in < 1 second.
  3. Open `/audit` page to show the recorded activity trail containing every timestamped check and reviewer action.
```

---

## 4. Manual Visual Checklist

- [ ] Dashboard Review Queue renders SummaryRow, ActiveBidsTable, and CaseFilesPanel without loading spinners.
- [ ] ActiveBidsTable displays Trane (RECOMMENDED), Carrier (REVIEW_REQUIRED), CoolTech (REJECT with action needed).
- [ ] Portfolio page allows filtering and selecting bids, rendering the TCO Comparison Bar Chart.
- [ ] Bid Detail page displays vendor name, equipment model, recommendation badge, and tab strip.
- [ ] Source tab displays extracted candidates, page numbers, and bounding-box / geometry status.
- [ ] Checks tab allows clicking "Inspect evidence & geometry" to open the drawer.
- [ ] RFI Modal opens, shows factual breach text, and allows human approval.
- [ ] TCO Slider dynamically updates calculated 5-year cost without page refresh.
- [ ] Audit log page displays recorded activity events and allows CSV export.

---

## 5. Honest Capability Matrix

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

## 6. Deterministic Fallback & Deployment Rollback

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
