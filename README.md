# 🚨 PO-lice — Purchase Order Liability, Intelligence & Compliance Engine
> **Amber's Procurement Enforcement Layer** | *Kaya AI IIT India Hackathon 2026 — Track 3: Procurement*

[![Hackathon](https://img.shields.io/badge/Hackathon-Kaya_AI_IIT_India_2026-sky.svg)](https://kaya-ai-iit-hackathon-2026.devpost.com/)
[![Track](https://img.shields.io/badge/Track-3:_Procurement-blue.svg)](https://kaya-ai-iit-hackathon-2026.devpost.com/)
[![Stage](https://img.shields.io/badge/Stage-2_Prototype_Building-orange.svg)]()
[![Team](https://img.shields.io/badge/Team-TensorTruss_(IIT_Madras)-purple.svg)]()
[![Repo](https://img.shields.io/badge/GitHub-Aparna--Jha--05%2Fkaya--ai-cyan.svg)](https://github.com/Aparna-Jha-05/kaya-ai)

---

## 💡 Core Golden Rule & Architecture Philosophy

> **"LLM / VLM extracts and explains; deterministic SQL and math validate."**

PO-lice enforces a **zero-hallucination hard firewall** between cognitive extraction and compliance judgment:

1. **Cognitive Extraction Layer**: PyMuPDF & LLaVA VLM parse unstructured vendor PDFs, tables, and 2D CAD blueprint coordinates into strict **Pydantic JSON**.
2. **Deterministic Judgment Layer**: PostgreSQL queries & Python math evaluate strict constraints against Amber's Project Graph. If a vendor equipment load exceeds limits, the system triggers a hard mechanical reject—no LLM opinion involved.
3. **Human Action Layer**: Procurement officers review evidence-backed verdicts with complete audit trails, approving purchase orders or dispatching automated counter-spec RFIs.

---

## 🛡️ The Four Patrols Specification

Every patrol runs deterministically. Generative AI models never vote on engineering compliance.

| Patrol | Scope | Logic / Method | Verdict Output |
| :--- | :--- | :--- | :--- |
| **Patrol 1: Building Patrol** | Engineering Physics | Substation power limit ($\le 1200\text{ kW}$) & Door width clearance ($\le 1.9\text{ m}$) | **PASS / FAIL** |
| **Patrol 2: Green Patrol** | Carbon Budget | Embodied carbon EPD factor lookup ($\le 450\text{ kgCO2e}$) | **PASS / FAIL** |
| **Patrol 3: Vice Squad** | Vendor Reliability | `pgvector` hybrid search over historical contracts & dispute counts | **Risk Score (1–10) / FLAG** |
| **Patrol 4: Traffic Control** | Schedule Ripple | NetworkX DAG + Bayesian Monte Carlo delay slip ($\text{₹}2.0\text{L/day}$ penalty) | **5-Yr $TCO^2$ / FLAG** |

### Mechanical Energy Balance Inequality (Patrol 1 Example):
$$\dot{Q}_{load} = \sum_{i=1}^{n} \dot{m}_i c_{p,i}(T_{out,i} - T_{in,i}) + \dot{Q}_{parasitic} \le \dot{Q}_{plant,max}$$

---

## ⚡ Key Dashboard Features & Differentiators

- 🌐 **The Evidence Board (Level-1 Differentiator)**: Interactive SVG directed graph mapping how one line-item substitution cascades into electrical panel redesign, carbon cap breach, door width clearance breach, vendor risk, and 5-Year $TCO^2$ financial loss.
- 🎛️ **What-If $TCO^2$ Simulator**: Dynamic slider recalculating upfront Capex discounts, delivery delay penalties ($\text{₹}2.0\text{L/day}$), and total operating cost in real-time.
- 📐 **VLM CAD Spatial Bounding Box**: Vision AI extracts equipment dimensions and renders a glowing SVG bounding box over 2D CAD blueprints to detect physical door clearance breaches ($\text{2.10m} > \text{1.90m}$).
- ✉️ **Jarvis Agent Handoff & RFI Drafter**: Converts patrol breaches into automated counter-spec RFI email drafts with an animated dispatch log stream.
- 🔍 **Human-in-the-Loop Confidence Heatmap**: Highlights field extraction confidence scores ($99\%$ vs $82\%$) and surfaces low-confidence OCR notes for instant verification.

---

## 📊 The Aha Moment: 5-Year $TCO^2$ Comparison

**Total Cost of Ownership Squared ($TCO^2$):** Upfront Capex + 5-Year OPEX + Carbon Liability + Schedule Delay Risk.

| Vendor | Upfront Cost | Engineering | Vendor Risk | Carbon | Schedule Risk | 5-Year $TCO^2$ | Decision |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Vendor A** | ₹4.2Cr | PASS | Low | PASS | Low | **₹6.0Cr** | 🟢 **Recommended** |
| **Vendor B** | ₹3.8Cr | **FAIL** | High | **FAIL** | Medium | **₹6.8Cr** | 🔴 **Hard Reject** |
| **Vendor C** | ₹4.5Cr | PASS | Medium | PASS | Low | **₹6.0Cr** | 🟡 **Acceptable** |

*The cheapest upfront bid (Vendor B) is the most expensive and riskiest once lifecycle operating cost, carbon penalties, and delay risks are factored in.*

---

## 🥊 Competitive Matrix

| Capability | ACC / BuildingConnected | Procore | EC3 Carbon | SAP Ariba | **PO-lice** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Bid RFP & Document Parsing | Partial | Partial | ❌ | Partial | 🟢 **Full PDF Extract** |
| Engineering/BIM Compliance Hard Gate | ❌ | ❌ | ❌ | ❌ | 🟢 **SQL / Physics Gate** |
| Vendor Track Record RAG Memory | Partial | ❌ | ❌ | ❌ | 🟢 **pgvector Search** |
| Equipment-Level Embodied Carbon Gate | ❌ | ❌ | Partial | ❌ | 🟢 **EPD SQL Gate** |
| Schedule Ripple & Downstream Impact | ❌ | ❌ | ❌ | ❌ | 🟢 **NetworkX DAG** |
| **Unified 5-Yr $TCO^2$ Decision Engine** | ❌ | ❌ | ❌ | ❌ | 🟢 **Deterministic Gate** |

---

## 🏗️ System Architecture & Data Pipeline

```
Vendor PDF → Document Intelligence → Pydantic JSON → The 4 Patrols → Unified Docket
                                                            │
    ┌───────────────────────┬───────────────────────────────┼──────────────────────────────┐
    ▼                       ▼                               ▼                              ▼
Patrol 1: Building      Patrol 2: Green                 Patrol 3: Vice                 Patrol 4: Traffic
(PostgreSQL BIM SQL)    (EPD Carbon Factor SQL)         (pgvector Vendor RAG)          (Monte Carlo & MCP™)
```

---

## 🎨 Design Tokens (Cohere & Supabase Theme)

| Token | Hex Code | Usage |
| :--- | :--- | :--- |
| **Deep Canvas** | `#090D16` | Main obsidian dark slate canvas |
| **Cards & Panels** | `#111827` | Elevated dark chrome surfaces with `#1E293B` borders |
| **Primary Accent (PASS)** | `#38BDF8` | **Electric Cyan** for PASS badges & primary actions *(Zero green)* |
| **Vice / RAG Accent** | `#818CF8` | **Indigo Violet** for Vice Squad RAG memory & agent logs |
| **Green Patrol Accent** | `#FBBF24` | **Amber Gold** for Green Patrol warnings & $TCO^2$ highlights |
| **Alert / Breach Accent** | `#F43F5E` | **Rose Red** for FAIL badges and door clearance breaches |

---

## 🧪 Quickstart & Verification Workflow

### 1. Backend Verification & Test Engine
```bash
# Install Python dependencies
python3 -m pip install -r backend/requirements-test.txt

# Seed synthetic vendor bids & run compliance engine test harness
python3 scripts/seed_demo_data.py
PYTHONPATH=backend python3 scripts/test_pipeline.py

# Run FastAPI backend server (Port 8000)
uvicorn backend.main:app --reload --port 8000
```

To validate the PostgreSQL/Supabase schema foundation, apply migrations before
inserting the clearly labelled synthetic demo records:

```bash
export SUPABASE_DATABASE_URL='postgresql://...'
python3 scripts/migrate_postgres.py
python3 scripts/seed_supabase.py
```

These commands prepare the database only. The HTTP API still uses the explicit
SQLite demo path until the PostgreSQL repository and authentication work lands.

`backend/openapi.json` is the committed frontend compatibility baseline.
Regenerate it with `python3 scripts/export_openapi.py`; CI rejects stale output.

### 2. Frontend Precinct Dashboard
```bash
# Run Next.js App Router UI (Port 3000)
npm run dev

# Verify clean production build
npm run build
```

---

## 📂 Repository Layout

```
po-lice/
├── AGENTS.md                  # Developer & AI Agent guidelines
├── README.md                  # Master documentation & setup guide
├── next.config.mjs            # Next.js configuration
├── package.json               # Frontend dependencies & scripts
├── tailwind.config.ts         # Tailwind CSS styling configuration
├── app/                       # Next.js 14 App Router UI (The Precinct Dashboard)
│   ├── layout.tsx             # Root layout with sidebar navigation
│   ├── page.tsx               # Primary dashboard overview & metrics
│   ├── globals.css            # Global CSS design tokens
│   ├── audit/                 # Audit trail view
│   │   └── page.tsx           # Audit log page component
│   └── bids/                  # Bids management & detailed workspace views
│       ├── page.tsx           # Bids portfolio overview
│       └── [id]/              # Dynamic bid detail route
│           └── page.tsx       # Individual bid workspace page
├── backend/                   # FastAPI Python 3.11+ Server
│   ├── main.py                # REST API endpoints & server entrypoint
│   ├── requirements.txt       # Python backend dependencies
│   ├── app/
│   │   ├── models/
│   │   │   └── schemas.py     # Pydantic schemas (VendorBidExtract, PatrolResult, DocketScorecard)
│   │   └── services/
│   │       ├── extractor.py   # PyMuPDF text & spec parser
│   │       ├── integrity.py   # Bid integrity matrix & correlation analyzer
│   │       ├── patrols.py     # Deterministic 4 Patrols compliance engine
│   │       └── repository.py  # Local SQLite / file-backed bid store
│   └── data/                  # SQLite DB & PDF upload storage
│       └── po_lice.sqlite3    # Local evidence database
├── components/                # React UI components
│   ├── cad-visualizer.tsx     # CAD spatial overlay visualizer
│   ├── rfi-modal.tsx          # Counter-spec RFI email drafter modal
│   ├── tco-slider.tsx         # What-If TCO² dynamic simulator
│   ├── bid/                   # Bid review & evidence board components
│   │   ├── ActiveBidsTable.tsx
│   │   ├── BidDetailClient.tsx
│   │   ├── BidPortfolio.tsx
│   │   ├── BidReviewWorkspace.tsx
│   │   ├── EvidenceBoard.tsx  # Level-1 Differentiator SVG directed graph
│   │   └── RecordBidReview.tsx
│   ├── navigation/            # App sidebar, Command Palette & theme controls
│   │   ├── AppSidebar.tsx
│   │   ├── CommandPalette.tsx
│   │   └── ThemeToggle.tsx
│   ├── precinct/              # Precinct dashboard widgets & panels
│   │   ├── ActiveBidsTable.tsx
│   │   ├── CaseFilesPanel.tsx
│   │   └── SummaryRow.tsx
│   └── ui/                    # Base UI components (Card, StatusDot, Tooltip)
├── lib/                       # Next.js client utilities & deterministic patrol engines
│   ├── api.ts                 # Backend API client bridge
│   ├── constants.ts           # Status tokens & UI constants
│   ├── integrity.ts           # Client-side integrity helpers
│   ├── mockData.ts            # Site constraints & mock bid fixtures
│   ├── patrols.ts             # Deterministic 4 Patrols TypeScript engine
│   └── tco.ts                 # TCO² calculation formulas
└── scripts/                   # Data seeders & test harnesses
    ├── migrations/            # Ordered PostgreSQL/pgvector migrations
    ├── migrate_postgres.py    # Checksum-verified migration runner
    ├── seed_demo_data.py      # Synthetic bid PDF seeder (creates PDFs in scripts/fixtures/)
    ├── seed_supabase.py       # Idempotent, synthetic-labelled PostgreSQL seeder
    ├── test_pipeline.py       # End-to-end Python compliance engine test script
    └── fixtures/              # Synthetic vendor bid PDF files
        ├── VendorA_Trane_Chiller_Bid.pdf
        ├── VendorB_CoolTech_Chiller_Bid.pdf
        └── VendorC_Carrier_Chiller_Bid.pdf
```

---

## 👥 Team TensorTruss
- **Jb Anmol**: Team Member, IIT Madras
- **Pratham Amritkar**: Team Member, IIT Madras
- **Aparna Jha**: Team Leader, IIT Madras
