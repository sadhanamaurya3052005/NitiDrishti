# Ingestion architecture

Official government pages are fetched by **our** connectors. The frontend never talks to a ministry URL.

```
OFFICIAL GOVERNMENT SOURCES
        ↓  whitelist + robots.txt (fail-closed)
SOURCE REGISTRY (`sources`)
        ↓  html | pdf | tabular | json | optional Playwright
INGESTION / CRAWLING
        ↓
BRONZE  storage/raw/{source_id}/{date}/{sha256}.*  + `source_documents`
        ↓  same SHA → skip (no overwrite)
VALIDATION + QUALITY FLAGS
        ↓
PARSE / OCR (pypdf; Tesseract only if FEATURE_AI_EXTRACTION and text is thin)
        ↓
NORMALIZE (₹ / lakh / dates — original wording kept on rule.detail)
        ↓
SILVER  extracted NormalizedScheme (needs_review until HITL)
        ↓  deterministic extractors; LLM does not vote
HUMAN VERIFICATION  GET/POST /api/v1/review
        ↓
GOLD  published `scheme_versions` + `eligibility_rules.ast_json`
        ↓  old versions never deleted
POSTGRESQL → FASTAPI → Citizen / CSC / Nyay-Mitra / Welfare / Admin
```

Live counts: `GET /api/v1/pipeline`. Orchestrator is **APScheduler** (`INGEST_INTERVAL_HOURS`). Airflow is **not** implemented.

Original flow (unchanged):

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
| `pdf` | `app/services/ingestion/pdf.py` | Text PDFs via pypdf. Thin scans use local Tesseract when `FEATURE_AI_EXTRACTION` is on. OCR extras (`pytesseract`/`Pillow`/`pymupdf`) and the Tesseract binary are optional; `GET /ready` `flags.ocr.status` is `available`, `not_configured`, or `unavailable`. |
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

## Failed ingestion logs (local `nitidrishti_db`)

Historical `ingestion_logs` with `status=failed` are **kept**. They are not deleted to make counts look clean. Classification of the 58 failed rows (2026-09-14 … 2026-09-24):

| Root cause (from `error_code` + `detail`) | Count | Notes |
|---|---|---|
| `SOURCE_UNAVAILABLE` — robots.txt fail-closed (403 / 500 / HTML body / unreachable / cannot confirm) | 30 | Correct. Do not bypass robots. |
| `SOURCE_UNAVAILABLE` — HTTP 404 after fetch | 15 | Official URL gone or redirected host 404. |
| `SOURCE_UNAVAILABLE` — TLS `SSLError` on Vikaspedia | 2 | Transient network. |
| `INTERNAL_ERROR` — `NameError` / `AttributeError` | 11 | Historical parser bugs on 2026-09-14. **Every one of those sources later ingested `ok`.** Current pipeline does not still fail them. |

No failed `detail` contained passwords, tokens, or Aadhaar-like digits. `http_status` is null on these rows because fail-closed robots/errors abort before a page status is stored.

Do not invent successful catalogue rows for permanently blocked or 404 hosts.

## Blocked / skipped hosts (observed)

- `nha.gov.in` — `robots.txt` `Disallow: /`
- `pmkisan.gov.in` — `robots.txt` HTTP 500 with the product user-agent (fail-closed)
- `data.gov.in`, `pib.gov.in`, `india.gov.in` robots — 403 for the bot UA
- MyScheme scheme pages — allowed, but body is client-rendered; Playwright optional
- Playwright is not installed by default
