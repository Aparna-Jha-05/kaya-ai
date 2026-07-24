# AGENTS.md — PO-lice Developer & AI Agent Guidelines

> **Project Name**: PO-lice (Purchase Order Liability, Intelligence & Compliance Engine)  
> **Hackathon**: Kaya AI IIT India Hackathon 2026 — Track 3: Procurement  
> **Team**: TensorTruss (IIT Madras) — Jb Anmol, Pratham Amritkar, Aparna Jha  
> **Repository**: `git@github.com:Aparna-Jha-05/kaya-ai.git`

---

## 🎯 Core Golden Rule & Philosophy

> **"LLM / VLM extracts and explains; deterministic SQL and math validate."**

1. **Zero Hallucination Engineering Compliance**: Never allow an LLM or generative model to vote or guess on engineering limits, substation power caps, or carbon allocations.
2. **Boundary Architecture**:
   - **Cognitive Extraction Layer**: Open-source LLMs (Mistral / LLaVA) & PyMuPDF extract unstructured PDF text, tables, and 2D CAD blueprint coordinates $\rightarrow$ validated Pydantic JSON.
   - **Deterministic Judgment Layer**: PostgreSQL SQL queries & Python math run strict inequalities against Amber's Project Graph $\rightarrow$ PASS / FAIL / FLAG decision with exact evidence proof.
   - **Human Action Layer**: Procurement officers approve, reject, or request counter-spec RFIs with full evidence trails.

---

## 📂 Repository Directory Map

```
po-lice/
├── AGENTS.md                  # This file - instructions for AI agents & contributors
├── README.md                  # Master documentation & demo walkthrough
├── docs/                      # Official project documentation
│   └── PO-LICE.pdf            # Master 20-page Hackathon proposal document
├── backend/                   # FastAPI Python 3.11+ Server
│   ├── main.py                # REST API entrypoint (/api/v1/bids/upload, /api/v1/agent/rfi-draft)
│   └── app/
│       ├── models/
│       │   └── schemas.py     # Pydantic JSON schemas (VendorBidExtract, PatrolResult, DocketScorecard)
│       └── services/
│           ├── extractor.py   # PyMuPDF text & regex spec parser
│           └── patrols.py     # Deterministic 4 Patrols engine (Building, Green, Vice, Traffic)
├── app/                       # Next.js 14 App Router UI (The Precinct Dashboard)
├── components/                # React components (Docket table, Evidence Board SVG, Case Files)
├── lib/                       # Next.js utilities (patrols.ts, tco.ts, mockData.ts)
└── scripts/                   # Fixture seeders & testing harnesses
    ├── seed_demo_data.py      # Generates synthetic vendor bid PDFs in scripts/fixtures/
    └── test_pipeline.py       # End-to-end compliance engine test script
```

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

### 1. Test Backend Pipeline
```bash
python3 scripts/seed_demo_data.py
PYTHONPATH=backend python3 scripts/test_pipeline.py
```

### 2. Run Backend Server
```bash
uvicorn backend.main:app --reload --port 8000
```

### 3. Run Frontend Server
```bash
npm run dev
```

---

## 👥 Team Roles & Responsibilities
- **Jb Anmol**: Full-Stack & Extraction Lead (FastAPI, PyMuPDF, Next.js dashboard, monorepo orchestration).
- **Pratham Amritkar**: Core Technical Lead — RAG & AI Systems (`pgvector`, `nomic-embed-text`, LlamaIndex, similarity search).
- **Aparna Jha**: Research, Domain Specs & QA Lead (BIM site limits, EPD carbon benchmarks, patrol accuracy validation).
