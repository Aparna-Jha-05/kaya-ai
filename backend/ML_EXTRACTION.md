# ML Extraction Operations

PO-lice uses a local-first extraction cascade. Models propose evidence-bound
facts; deterministic patrol code remains the only compliance decision maker.

## Runtime order

1. PyMuPDF and regex extraction.
2. Ollama only for unresolved supported fields when `OLLAMA_ENABLED=true`.
3. Gemini only when unresolved fields remain and all remote controls are set.
4. Server-side Pydantic validation, evidence matching, and unit normalization.
5. Human review when candidates disagree or remain unresolved.

No provider is called when deterministic extraction resolves all supported
fields. Provider output cannot contain patrol verdicts because the structured
response schema rejects unknown fields.

## Local Ollama

Install and start Ollama separately, pull the model selected by the team, then
configure:

```bash
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=<evaluated-model-tag>
ML_EXTRACTION_DEADLINE_SECONDS=20
```

`mistral:7b-instruct-v0.3-q4_K_M` is a benchmark candidate, not a validated winner. Keep Ollama
disabled until it and one feasible local alternative have been evaluated on
the labeled harness:

```bash
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=backend \
  python3 scripts/evaluate_extraction.py --assert-baseline
```

A cloud backend cannot reach Ollama running on a teammate's laptop. Cloud use
requires a separately deployed, authenticated Ollama service reachable from
the backend network.

## Optional Gemini fallback

Remote extraction remains disabled unless every control is present:

```bash
REMOTE_EXTRACTION_ENABLED=true
REMOTE_EXTRACTION_PROJECTS=demo
GEMINI_MODEL=<supported-model-name>
GEMINI_API_KEY=<server-side-secret>
```

The project identifier must appear in `REMOTE_EXTRACTION_PROJECTS`. Only
unresolved fields and the minimum required document text are sent. Each
request records provider, model, project, disclosed fields, and timestamp in
the extraction report. API keys are not part of response models.

Do not send confidential vendor documents to a remote provider without team
approval for that project. Never place provider keys in `NEXT_PUBLIC_*`,
frontend code, fixtures, logs, or commits.

## Deterministic baseline

The 2026-07-27 baseline ran on arm64 macOS with Python 3.12.11 and a 20-second
configured request deadline:

| Metric | Result |
| --- | ---: |
| Labeled field accuracy | 1.000 |
| Unit accuracy | 1.000 |
| Unsupported-value invention rate | 0.000 |
| Evidence support rate | 1.000 |
| Remote requests | 0 |
| Median extraction latency | 4.433 ms |
| Maximum extraction latency | 13.356 ms |

These figures describe four synthetic deterministic fixtures, not model
quality or production performance. Re-run the harness on demonstration
hardware and publish provider-specific results before enabling a model.

## Rollback

Set both `OLLAMA_ENABLED=false` and `REMOTE_EXTRACTION_ENABLED=false`.
Extraction then returns to the deterministic path; missing evidence stays
missing and patrols continue to return review flags.
