# Data flow

```
Official source  →  connector (html/pdf/json/tabular/dynamic)
                 →  whitelist + robots.txt
                 →  source_documents (content hash)
                 →  scheme_versions / eligibility_rules / benefits / required_documents
Citizen / CSC / officer  →  FastAPI  →  service  →  repository  →  PostgreSQL
```

Frontend talks only to this API. It never fetches a government URL.

## Sync (user waits)

Auth, profile, search, eligibility, dashboard and analytics reads.

## Async (background)

Crawl, download, OCR, extraction, validation, dedup, versioning, alerts, embeddings.

## Guest

Zero server rows. Unauthenticated traffic must not insert `users`, `alerts`, `action_dossiers`, or `audit_logs`.

## Eligibility

Rules land in `eligibility_rules.ast_json`. The engine that evaluates them is deterministic. The LLM, when it arrives, only extracts candidates.
