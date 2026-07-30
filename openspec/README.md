# PO-LICE OpenSpec Index

OpenSpec artifacts are committed because they are shared engineering
contracts. They record intended behavior, design decisions, acceptance
criteria, and unfinished work; they are not proof that every described
capability is implemented.

Executed code and assertion-based tests remain the source of truth for current
behavior. Pull-request CI validates every active change with strict OpenSpec
validation.

## Active changes

| Change | Task progress | Current interpretation |
| --- | ---: | --- |
| [Robust Supabase backend](./changes/robust-supabase-backend/) | 35/49 | SQLite demo persistence and PostgreSQL foundations exist; Supabase runtime CRUD, authentication/RLS, object storage, durable audit, and pgvector RAG remain planned |
| [Multi-provider PDF extraction](./changes/multi-provider-pdf-extraction/) | 20/24 | Deterministic extraction plus optional Ollama and Gemini adapters exist; comparative model evaluation and staging enablement remain open |
| [Configurable AI provider routing](./changes/configurable-ai-provider-routing/) | 0/28 | Future proposal: OpenAI/Anthropic adapters, capability discovery, explicit provider selection, and evaluated routing are not implemented |

Task progress is intentionally conservative. A checkbox is completed only
after the required implementation and verification evidence exist.

## Archived changes

| Change | Task progress | Outcome |
| --- | ---: | --- |
| [Competition demo readiness](./changes/archive/2026-07-30-competition-demo-readiness/) | 24/24 | Repository-controlled competition gates passed; the synthetic prototype is demo-ready |

## What belongs in Git

- proposals, designs, specifications, and task lists;
- non-secret architecture decisions and acceptance criteria;
- links to reproducible CI or public synthetic-demo evidence;
- clearly labeled limitations and future work.

## What stays out of Git

- `.env` files, API keys, tokens, and provider credentials;
- real bid documents, vendor data, personal data, or confidential terms;
- private recordings or media requiring restricted access;
- local agent configuration, scratch prompts, browser traces, logs, and caches.

## Archive rule

Archive a change only when its implementation tasks are complete, strict
validation passes, required runtime evidence exists, and any delta
specifications have been synchronized. Incomplete changes remain active and
clearly labeled rather than being hidden or prematurely archived.
