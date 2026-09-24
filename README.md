# NitiDrishti — नीतिदृष्टि

**Right Scheme. Right Opportunity. Right Rule. Right Time.**

An AI-assisted welfare and opportunity intelligence platform. It collects government schemes,
scholarships, jobs, internships and policy documents from **official sources through its own
ingestion pipeline**, understands them with AI/NLP, verifies and versions them, and then tells each
citizen exactly what they qualify for — with the reason, the source and the verification date.

> No third-party or paid data API is used to obtain government information.

---

## Current state

| | |
|---|---|
| Status | Freeze tag **`v1.0-final`** — QA / security / data audit starts here. No major features during the audit. |
| Frontend | Next.js 15 App Router + TypeScript + Tailwind + Framer Motion |
| Backend | FastAPI + SQLAlchemy + Alembic — `/health`, `/ready`, `/api/version` |
| Database | Native PostgreSQL (this machine: 18). No Docker. Schema via Alembic. `pg_trgm` + `unaccent` required. PostGIS and pgvector are **not required** (maps use bundled TopoJSON; embeddings have no VECTOR column). |

---

## Repository layout

```
NitiDrishti/
├── frontend/          Next.js application
├── backend/           FastAPI + Alembic + pytest
│   └── app/services/
│       ├── ingestion/     bronze → silver → gold pipeline (not a data_pipeline/ tree)
│       └── eligibility/   AST engine (not a rule_engine/ tree)
├── database/init/     one-time SQL (extensions only)
├── docs/              architecture, API, deploy, security
├── scripts/           native pg_dump backup drill
├── storage/           raw snapshots + backups (git-ignored)
├── .env.example
├── .gitignore
└── README.md
```

There is **no** top-level `data_pipeline/` or `rule_engine/` folder. Those stages live in `backend/app/services/`. `.env` is git-ignored.

---

## Local setup (VS Code terminal)

Open the repo in VS Code (`D:\NitiDrishti`). Use **two terminals** (`` Ctrl+` `` then the `+` button). PostgreSQL Windows service must be **Running**. Docker is not used.

### 0. Prerequisites

Node.js 20+, Python 3.11+, native PostgreSQL on `localhost:5432`, Git.

### 1. Environment (once)

```powershell
Copy-Item .env.example .env
Copy-Item frontend\.env.local.example frontend\.env.local
```

Edit `.env`: set `POSTGRES_PASSWORD`, a long `JWT_SECRET_KEY`, and `POSTGRES_DB` to the database you actually created. The documented local database name is **`nitidrishti_db`**. Settings fallback if `POSTGRES_DB` is unset is `nitidrishti_dev`. `DATABASE_URL` is an optional override that replaces the `POSTGRES_*` parts.

### 2. Database (once)

Create a database that matches `.env` (`POSTGRES_DB` / `POSTGRES_USER`). Then from `backend/`:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
# Native PostgreSQL 18 / Git for Windows may set CURL_CA_BUNDLE to a missing file.
# That is a Windows environment issue, not a project setting. Unset before pip/psycopg TLS.
if ($env:CURL_CA_BUNDLE) { Remove-Item Env:CURL_CA_BUNDLE }
pip install -r requirements.txt
python -m scripts.init_extensions
alembic upgrade head
python -m scripts.seed_reference
python -m scripts.bootstrap_operators
```

`pg_trgm` and `unaccent` are required. **PostGIS is optional / not required** (GIS uses bundled TopoJSON; native PostgreSQL 18 here does not install it). **pgvector is optional / future** (semantic search; `document_embeddings` has no `VECTOR` column). Do not install either extension just to remove a warning.

If `Activate.ps1` is blocked once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

On Windows, uvicorn may log `WinError 10054` when a browser tab, service worker, or `next dev` aborts a request. That is a client disconnect (`WSAECONNRESET`). If `/health` still returns and the process is alive, it is not a server crash.

### 3. Every day — Terminal A (API)

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

Verify: <http://127.0.0.1:8000/health> and <http://127.0.0.1:8000/docs>

### 4. Every day — Terminal B (UI)

First time: `cd frontend; npm install`

Every day:

```powershell
cd frontend
npm run dev
```

Open <http://localhost:3000> (if port 3000 is busy, Next uses **3001**; CORS allows both). Stop with **Ctrl+C** in each terminal.

After pulling schema changes:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
alembic upgrade head
```

The emblem boot sequence plays once per browser session; press **Skip** to bypass it.

Routes available now:

| Route | Contents |
|---|---|
| `/` | Public overview: purpose, workspaces, capabilities, data policy, stack |
| `/citizen` | Citizen & Student workspace |
| `/csc` | CSC / Kiosk desk |
| `/nyay-mitra` | Policy intelligence workspace |
| `/welfare` | Welfare officer desk |
| `/analytics` | District analytics cockpit |

Inside the application shell: `Ctrl`/`Cmd` + `K` opens the command palette, the speaker
button reads the page aloud, and the role selector previews how navigation changes per role.
Workspace pages state what they will contain and show an honest empty state — they are never
filled with sample data.

Run backend and frontend as two native processes (`uvicorn` + `next dev`). Docker is not part of this project.

### Scheduled catalog refresh (batch, not live)

The backend process includes scheduled catalogue refresh (`INGEST_INTERVAL_HOURS`, default 24). `INGEST_SCHEDULE_ENABLED=true` is the default outside tests.

```powershell
# Optional dedicated native process (first pass immediately, then every INGEST_INTERVAL_HOURS)
cd backend
if ($env:CURL_CA_BUNDLE) { Remove-Item Env:CURL_CA_BUNDLE }
.\.venv\Scripts\Activate.ps1
python -m scripts.run_scheduler
```

Robots.txt is fail-closed and each source waits `INGESTION_CRAWL_DELAY_SECONDS`. If a crawl already ran inside the interval, the next job skips. Tests / `APP_ENV=testing` never start the crawler. Set `INGEST_SCHEDULER_ENABLED=false` (or `INGEST_SCHEDULE_ENABLED=false`) to disable in the API process.

Operator desks: `python -m scripts.bootstrap_operators` seeds one `WELFARE_OFFICER`, one `ADMIN`, and one `CSC_OPERATOR` from `BOOTSTRAP_*` env values. Self-registration stays `CITIZEN`. Sign in at `/login` as **Welfare officer** with `BOOTSTRAP_OFFICER_EMAIL`. CSC camp dispatch (`POST /api/v1/analytics/districts/{id}/csc-camp`) is officer/admin only. Guests write zero rows.

---

## Checks

```powershell
# backend
cd backend; pytest; ruff check .

# frontend
cd frontend; npm run typecheck; npm run lint; npm run build
```

### Five-minute demos (API must be running)

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m scripts.demo_citizen_ast
python -m scripts.demo_officer_hitl
python -m scripts.demo_nyay_gazette
```

| Script | What it proves |
|---|---|
| `demo_citizen_ast` | Eligibility status comes from Postgres AST (`ELIGIBLE` / `PARTIAL_INFO` / `INELIGIBLE`), not an LLM vote |
| `demo_officer_hitl` | Guest cannot read the review queue; an officer token lists `needs_review` rows |
| `demo_nyay_gazette` | Policy compare echoes `as_of` and ingested version/gazette refs |

Officer HITL needs `ND_OFFICER_EMAIL` / `ND_OFFICER_PASSWORD` (from `bootstrap_operators`). Guest 401 is still a successful demo.

---

## Where the data comes from

| Source form | How it is read |
|---|---|
| Static HTML pages | requests + BeautifulSoup |
| JavaScript-rendered pages | Playwright (optional; skipped if not installed) |
| Official PDFs | pypdf text extract |
| CSV / Excel / JSON | openpyxl / stdlib parsers |

Every stored record keeps its source URL, source document, retrieval time and
version number, so anything shown to a citizen can be traced back.

---

## Backup drill (native PostgreSQL 18)

Docker is not used. `pg_dump` must be on PATH (or under `C:\Program Files\PostgreSQL\18\bin`).
Passwords stay in `POSTGRES_PASSWORD` / `PGPASSWORD` and are never printed.

```powershell
cd D:\NitiDrishti
if ($env:CURL_CA_BUNDLE) { Remove-Item Env:CURL_CA_BUNDLE }
powershell -File scripts\backup-drill.ps1 -DryRun
powershell -File scripts\backup-drill.ps1 -RestoreDb nitidrishti_verify
```

Restore-verify prints `alembic_current` and table counts. It does not invent KPIs.

Suggested remote layout (not a live portal): Vercel for `frontend/`, a VM running
`uvicorn app.main:app`, native Postgres — see `docs/deploy.md`. PostGIS is not required.

---

## Status

Academic 2026–27 SIH260092 — not a live sarkari portal. Freeze tag `v1.0-final`.

**Known limitations (do not over-claim in viva):** not a ministry apply API; not Airflow;
AI/NLP extraction is not live (`FEATURE_AI_EXTRACTION` default false); PostGIS is not serving
the map; offline is a catalog snapshot, not a full PWA; disaster DSS is catalog rows only
and default off; guest writes zero server PII rows.

Live catalog / pipeline sizes: `GET /api/v1/analytics/summary` and `GET /api/v1/pipeline`.
