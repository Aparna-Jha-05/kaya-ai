# 🚨 PO-lice — Purchase Order Liability, Intelligence & Compliance Engine
> **Amber's Procurement Enforcement Layer** | *Kaya AI IIT India Hackathon 2026 — Track 3: Procurement*

[![Hackathon](https://img.shields.io/badge/Hackathon-Kaya_AI_IIT_India_2026-sky.svg)](https://kaya-ai-iit-hackathon-2026.devpost.com/)
[![Track](https://img.shields.io/badge/Track-3:_Procurement-blue.svg)](https://kaya-ai-iit-hackathon-2026.devpost.com/)
[![Stage](https://img.shields.io/badge/Stage-2_Prototype_Building-orange.svg)]()
[![Team](https://img.shields.io/badge/Team-TensorTruss_(IIT_Madras)-purple.svg)]()
[![Repo](https://img.shields.io/badge/GitHub-Aparna--Jha--05%2Fkaya--ai-cyan.svg)](https://github.com/Aparna-Jha-05/kaya-ai)

---

## 🎯 Core Golden Rule & Philosophy

> **"LLM / VLM extracts and explains; deterministic SQL and math validate."**

1. **Zero Hallucination Engineering Compliance**: Generative AI models are never permitted to vote or guess on engineering limits, substation power caps, or carbon allocations.
2. **Boundary Architecture**:
   - **Cognitive Extraction Layer**: PyMuPDF & LLaVA 1.6 VLM extract unstructured PDF text, tables, and 2D CAD blueprint coordinates $\rightarrow$ validated Pydantic JSON.
   - **Deterministic Judgment Layer**: PostgreSQL SQL queries & Python math run strict inequalities against Amber's Project Graph $\rightarrow$ PASS / FAIL / FLAG decision with exact evidence proof.
   - **Human Action Layer**: Procurement officers approve, reject, or request counter-spec RFIs with full audit trail fidelity.

---

## ⚡ Key Features & Innovations

- 🌐 **The Evidence Board (Level-1 Differentiator)**: Interactive SVG directed consequence graph showing exactly how one substituted line item cascades into power draw, electrical panel redesign, carbon cap breach, door width clearance breach, vendor risk, schedule slip, and 5-Year $TCO^2$ financial loss.
- 🎛️ **Feature A (What-If $TCO^2$ Simulator)**: Real-time interactive slider component recalculating upfront Capex discounts, delivery delay penalties ($\text{₹}2.0\text{L/day}$), and 5-Year $TCO^2$ in real-time.
- 📐 **Feature B (VLM CAD Spatial Overlay)**: LLaVA Vision AI equipment width extraction rendering a glowing SVG bounding box over a 2D CAD blueprint image to detect physical door clearance breaches ($\text{2.10m} > \text{1.90m}$).
- ✉️ **Feature C & D (Jarvis Agent Handoff & RFI Drafter)**: Converts patrol breaches into an automated Counter-Spec RFI email draft, with an animated "Approve & Hand Off to Jarvis" dispatch log stream.
- 🔍 **Human-in-the-Loop Confidence Heatmap**: Displays field extraction confidence scores ($99\%$ vs $82\%$) and surfaces low-confidence OCR notes for 1-click human verification.
- ⌨️ **Raycast Command Bar (`⌘K`)**: High-speed keyboard shortcuts (`⌘1`, `⌘2`, `⌘3`, `⌘R`) for institutional command center navigation.

---

## 🛡️ The Four Patrols Specification

| Patrol | Check Type | Logic / Method | Output |
| :--- | :--- | :--- | :--- |
| **Patrol 1: Building Patrol** | Engineering SQL | Substation power limit ($\le 1200\text{ kW}$) & Door width clearance ($\le 1.9\text{ m}$) | PASS / FAIL |
| **Patrol 2: Green Patrol** | Carbon Budget SQL | Embodied carbon EPD factor lookup ($\le 450\text{ kgCO2e}$) | PASS / FAIL |
| **Patrol 3: Vice Squad** | Vendor RAG Memory | `pgvector` hybrid search over historical contracts & dispute counts | Risk Score (1–10) / FLAG |
| **Patrol 4: Traffic Control** | Schedule Ripple | NetworkX DAG + Bayesian Monte Carlo delay slip ($\text{₹}2.0\text{L/day}$ penalty) | 5-Yr $TCO^2$ / FLAG |

---

## 🎨 Visual Design Language Tokens (Cohere & Supabase Theme)

| Token | Hex Code | Usage |
| :--- | :--- | :--- |
| **Deep Canvas** | `#090D16` | Main obsidian dark slate canvas |
| **Cards & Panels** | `#111827` | Elevated dark chrome surfaces with `#1E293B` micro-borders |
| **Primary Accent (PASS)** | `#38BDF8` | **Electric Cyan** for PASS badges & primary actions *(Zero green)* |
| **Vice / RAG Accent** | `#818CF8` | **Indigo Violet** for Vice Squad RAG memory & Jarvis agent logs |
| **Green Patrol Accent** | `#FBBF24` | **Amber Gold** for Green Patrol warnings & $TCO^2$ highlights |
| **Alert / Breach Accent** | `#F43F5E` | **Rose Red** for FAIL badges, hard rejects, and door limit breaches |

---

## 🧪 Verification & Development Workflow

### 0. Install backend dependencies
```bash
python3 -m pip install -r backend/requirements.txt
```

### 1. Seed Demo Data & Test Python Compliance Engine
```bash
python3 scripts/seed_demo_data.py
PYTHONPATH=backend python3 scripts/test_pipeline.py
```

### 2. Run FastAPI Backend Server
```bash
uvicorn backend.main:app --reload --port 8000
```

### 3. Run Next.js Frontend Command Center
```bash
export PATH=$PATH:/opt/homebrew/bin
npm run dev      # Opens http://localhost:3000
npm run build    # Verify clean production build
```

### Enriched Constraint Graph demo

The upload API validates PDF type and size before extracting a SHA-256 fingerprint, PyMuPDF metadata, agreement clauses, and the connection IP in its validated bid record. Missing fields remain explicit review flags; they are never guessed. The four patrols deterministically evaluate contractual warranty, market-price anomalies, the Agreement Compliance Index, Bid Integrity Matrix correlations, and lifecycle state. `POST /api/v1/bids/simulate` is the backend source of truth for Dynamic Docket Scenario Modeling.

To initialise PostgreSQL after your base Amber tables exist:

```bash
psql "$DATABASE_URL" -f scripts/postgres_schema.sql
DATABASE_URL="$DATABASE_URL" python3 scripts/seed_postgres.py
```

---

## 📂 Repository Directory Map

```
po-lice/
├── AGENTS.md                  # Developer & AI Agent guidelines and rules
├── DESIGN.md                  # Design system tokens and component specs
├── README.md                  # Master documentation & setup guide
├── backend/                   # FastAPI Python 3.11+ Server
│   ├── main.py                # REST API entrypoint (/api/v1/bids/upload, /api/v1/agent/rfi-draft)
│   └── app/
│       ├── models/
│       │   └── schemas.py     # Pydantic schemas (VendorBidExtract, PatrolResult, DocketScorecard)
│       └── services/
│           ├── extractor.py   # PyMuPDF text & spec extractor
│           └── patrols.py     # Deterministic 4 Patrols compliance engine
├── app/                       # Next.js 14 App Router UI (The Precinct Dashboard)
├── components/                # React UI components (Evidence Board, CAD visualizer, TCO slider, RFI modal)
└── scripts/                   # Fixture seeders & testing harnesses
    ├── seed_demo_data.py      # Generates synthetic vendor bid PDFs in scripts/fixtures/
    └── test_pipeline.py       # End-to-end Python compliance engine test script
```

---

## 👥 Team TensorTruss (IIT Madras)
- **Jb Anmol**: Full-Stack & Extraction Lead *(IIT Madras)*
- **Pratham Amritkar**: Core Technical Lead — RAG & AI Systems *(IIT Madras)*
- **Aparna Jha**: Research, Domain Specs & QA Lead *(IIT Madras)*
