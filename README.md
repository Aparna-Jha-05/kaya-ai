# PO-LICE · The Precinct

> Amber's procurement enforcement layer. **LLM extracts and explains, deterministic SQL/math validates.**

A proposal-stage demo that deploys on Vercel with zero backend. It walks a judge through one story in under two minutes: a substituted vendor chiller that looks cheap on paper but fails engineering, carbon, reliability and schedule once the math runs.

## The golden rule: real math, mocked LLM

| Layer | Status | Where |
|---|---|---|
| The four patrols (engineering, carbon, vendor, schedule) | **REAL** deterministic TypeScript | [`lib/patrols.ts`](lib/patrols.ts) |
| TCO² scorecard math | **REAL** | [`lib/tco.ts`](lib/tco.ts) |
| Traffic Control delay estimate | **REAL** ~1000-iteration Monte Carlo | [`lib/patrols.ts`](lib/patrols.ts) |
| LLM extraction, PostgreSQL, EPD table, vendor RAG | Mocked hardcoded data | [`lib/mockData.ts`](lib/mockData.ts) |
| Jarvis handoff, MCP Planner, Kaya/Amber webhook | Mocked (marked with a `MOCKED` badge) | UI |

Everything is in-memory and resets on refresh. No database, no LLM API, no GPU.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # verify the production build
```

## The demo path

1. Land on **The Precinct** — three vendors, Vendor B pulsing red.
2. Click **Vendor B** → extraction streams in; `power_draw_kw` trips the confidence flag (handwritten annotation, human-in-the-loop).
3. The **VLM** reads the CAD footprint; floor load fails.
4. The **four patrols** run: Building FAIL, Green FAIL, Vice FLAG (10/10), Traffic FLAG (~12 days).
5. The **Evidence Board** renders the cascade from one substituted chiller.
6. The **Docket** proves Vendor B is cheapest upfront yet worst on TCO².
7. **Case Files** drafts the missing-cert email → hand to Jarvis (mock success).
8. Open the **Audit Log** and export CSV.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · framer-motion · recharts · lucide-react. The Evidence Board is a self-contained SVG directed-graph renderer (deterministic geometry, no layout dependency) so it renders identically everywhere.

---

Track 3: Procurement · UN SDGs 8, 9, 11, 12 · Team TensorTruss, IIT Madras.
Humans decide, PO-lice provides evidence.
