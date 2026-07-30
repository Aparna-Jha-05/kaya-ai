# PO-LICE Business Overview

## Problem

Engineering procurement teams compare price, technical compliance,
sustainability, delivery, commercial clauses, and document evidence across
large vendor bids. These checks are slow to reconcile manually, and the
cheapest bid can create costly downstream risk when it violates a hard site
constraint.

## Product

PO-LICE turns a bid document into an explainable review docket. It helps an
officer answer:

- What did the vendor claim?
- Where is that claim in the source document?
- Which project constraint applies?
- Did the bid pass, fail, or lack enough evidence?
- What requires a human decision or a request for information?

The product supports review; it does not autonomously award or reject a
contract.

## Intended users

| User | Need |
| --- | --- |
| Procurement officer | Compare offers and record an accountable decision |
| Engineering reviewer | Verify equipment against physical and electrical limits |
| Sustainability reviewer | Check embodied-carbon evidence and project caps |
| Commercial/legal reviewer | Find risky clauses and missing certificates |
| Project manager | Understand schedule exposure and lifecycle changes |
| Auditor | Reconstruct evidence, rule inputs, versions, and human actions |

## Value proposition

1. **Faster triage** — evidence and exceptions are assembled into one docket.
2. **Safer decisions** — deterministic hard limits cannot be overridden by
   model wording.
3. **Explainability** — each extracted fact points back to its source evidence.
4. **Human control** — RFIs and decisions require explicit reviewer actions.
5. **Reproducibility** — constraint and decision versions preserve why a result
   was produced.
6. **Low-cost prototype path** — the core demo works without a paid model;
   local Ollama or Gemini can be enabled only when appropriate.

No savings, accuracy, or return-on-investment percentage is claimed without a
real procurement pilot and measured baseline.

## Competition demo story

The three seeded bids tell a deliberate story:

- **CoolTech Global** is cheapest but breaches power and embodied-carbon
  limits, so deterministic patrols recommend rejection.
- **Carrier Industries** needs review because evidence or commercial signals
  remain unresolved.
- **Trane Solutions** stays within the demonstrated constraint envelope and is
  recommended.

The reviewer can then inspect source evidence, approve an RFI draft, adjust a
bounded cost scenario, upload a synthetic bid, and view the activity trail.
The exact three-minute sequence is in [DEMO_RUNBOOK.md](./DEMO_RUNBOOK.md).

## Differentiation

PO-LICE separates probabilistic extraction from deterministic compliance:

```text
document → evidence candidates → validation → deterministic patrols → human action
```

This boundary is more important than the choice of model. Gemini or Ollama
may improve extraction coverage, but neither provider controls engineering
thresholds or the final decision.

Other prototype differentiators:

- local-first deterministic extraction and optional AI;
- page-level source rectangles and geometry status;
- missing evidence handled as a review flag;
- version-aware constraints and reviewer actions;
- live bid comparison rather than a standalone chatbot.

## Current scope

### Demonstrated

- public Next.js review dashboard;
- FastAPI bid workflow;
- synthetic PDF upload and evidence extraction;
- four deterministic patrols;
- SQLite/filesystem demo persistence;
- bid comparison and bounded TCO scenario;
- RFI approval and reviewer decision recording;
- activity history and CSV export;
- deterministic fallback when AI is unavailable.

### Not yet production-ready

- enterprise identity, authorization, and Supabase RLS;
- managed object storage and retention policies;
- durable multi-project integrity correlation;
- production audit immutability and regulatory controls;
- live supplier/vendor knowledge retrieval;
- actual RFI delivery to external parties;
- full CAD/BIM/VLM interpretation;
- evaluation on confidential, representative procurement documents;
- availability, security, and load guarantees.

## Adoption path

1. Run a controlled pilot with synthetic or approved non-confidential bids.
2. Agree on project constraints and an authoritative unit dictionary.
3. Measure extraction coverage, false flags, review time, and reviewer
   corrections against the manual process.
4. Add authentication, project isolation, durable storage, and audit controls.
5. Enable a remote model only after privacy approval and provider-specific
   evaluation.
6. Integrate dispatch, supplier provenance, and enterprise systems after the
   review workflow is accepted.

The active plans are maintained under
[OpenSpec changes](./openspec/changes/); the current implementation is
described in [TECHNICAL.md](./TECHNICAL.md).

## Team contributions

| Team member | Role |
| --- | --- |
| **Jb Anmol** | Full-stack integration, extraction, backend orchestration, and release verification |
| **Pratham Amritkar** | RAG and AI systems |
| **Aparna Jha** | Procurement-domain specifications and QA |

PO-LICE was created for the Kaya AI IIT India Hackathon 2026, Track 3:
Procurement.
