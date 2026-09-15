# Ingestion architecture

Official government pages are fetched by **our** connectors. The frontend never talks to a ministry URL.

```
Official URL
    → whitelist (.gov.in / .nic.in / listed extras)
    → robots.txt (fail-closed if unreadable or Disallow)
    → connector fetch (html | dynamic | pdf | tabular | json)
    → raw snapshot  storage/raw/{source_id}/{date}/{content_hash}.*
    → source_documents (unique source_id + content_hash)
    → extract (deterministic; no LLM)
    → validate
    → scheme_versions insert (never UPDATE gazette text)
    → schemes.current_version_id retarget
```

Writes go `CLI/script → SchemeIngestionService → repositories → PostgreSQL`. Feature reads go `API → SchemeCatalogService → SchemeRepository`. Routes do not issue SQL.

## Connectors

| Type | Module | Notes |
|---|---|---|
| `html` | `app/services/ingestion/html.py` | requests + BeautifulSoup; reads `__NEXT_DATA__` when present |
| `dynamic` | `app/services/ingestion/dynamic.py` | Optional Playwright. Not required. No login, no CAPTCHA |
| `pdf` | `app/services/ingestion/pdf.py` | Text PDFs via pypdf. Scanned/OCR is later |
| `tabular` | `app/services/ingestion/tabular.py` | CSV and Excel |
| `json` | `app/services/ingestion/json_source.py` | Departmental JSON lists or objects |

Guards: `INGESTION_ALLOWED_DOMAINS` plus `.gov.in` / `.nic.in` suffixes and explicit MeitY hosts (`vikaspedia.in`). Size cap `INGESTION_MAX_FILE_MB`. Retry/backoff on timeout. Redirects must stay on a whitelisted host.

## First crawl

`python -m scripts.ingest_official_schemes` from `backend/` (unset `CURL_CA_BUNDLE` on Windows first).

Registry: `app/services/ingestion/registry.py`. Primary pages are **Vikaspedia** (MeitY / C-DAC; `User-agent: * Allow: /`). A listing URL may enqueue extra same-host scheme links, capped. MyScheme HTML is registered but scheme bodies are JS-filled without Playwright.

Facts (name, summary, benefits, rules) come from the fetched artefact. Registry only stores URL, connector, and identity keys (slug / official code / department). Empty or thin pages are stored as `needs_review` and are **not** listed on the public catalog.

## Dedup and versions

- Same `(source_id, content_hash)` → ingestion log `ok`, `rows_upserted=0`, no new version.
- Changed normalized fingerprint → insert `scheme_versions` with `version_number + 1` and point `schemes.current_version_id` at it. Old rows stay.
- Change kinds: `NEW`, `UPDATED`, `BENEFIT_CHANGED`, `ELIGIBILITY_CHANGED`.

## APIs (envelope `{success, data, error, request_id}`)

| Method | Path | Auth |
|---|---|---|
| GET | `/api/v1/schemes` | public; published rows, else static official-facts fallback |
| GET | `/api/v1/schemes/{id}` | slug or UUID |
| GET | `/api/v1/schemes/{id}/versions` | immutable history |
| GET | `/api/v1/sources/status` | last crawl per source |
| GET | `/api/v1/updates` | recent versions |

`GET /health` and `GET /api/version` stay flat. Admin `POST /sources/{id}/run` is protected by JWT; trigger ingest from the CLI unless you have an admin session.

JSON list shape is unchanged: `id, code, name, nameHi, ministry, ministryHi, category, badge, badgeHi, summary, summaryHi, benefit, benefitHi, documents, rules, sourceUrl`. Desks are **not** rebuilt to consume Postgres.

## Blocked / skipped hosts (observed)

- `nha.gov.in` — `robots.txt` `Disallow: /`
- `pmkisan.gov.in` — `robots.txt` HTTP 500 with the product user-agent (fail-closed)
- `data.gov.in`, `pib.gov.in`, `india.gov.in` robots — 403 for the bot UA
- MyScheme scheme pages — allowed, but body is client-rendered; Playwright optional
- Playwright is not installed by default
