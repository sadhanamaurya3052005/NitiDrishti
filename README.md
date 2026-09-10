# NitiDrishti — नीतिदृष्टि

**Right Scheme. Right Opportunity. Right Rule. Right Time.**

An AI-assisted welfare and opportunity intelligence platform. It collects government schemes,
scholarships, jobs, internships and policy documents from **official sources through its own
ingestion pipeline**, understands them with AI/NLP, verifies and versions them, and then tells each
citizen exactly what they qualify for — with the reason, the source and the verification date.

> No third-party or paid data API is used to obtain government information.
> See `PROJECT_RULES.md`, Rule 1.

---

## Current state

| | |
|---|---|
| Phase | **0 — Project Foundation** (complete once the checklist in `TASKS.md` is ticked) |
| Frontend | Next.js App Router + TypeScript + Tailwind + Framer Motion — design system, cinematic emblem transition, bilingual landing experience |
| Backend | FastAPI + SQLAlchemy + Alembic — configuration, structured logging, `/health`, `/api/version` |
| Database | PostgreSQL 16 + PostGIS (native / managed). No Docker. Tables start in Phase 2. |

---

## Repository layout

```
NitiDrishti/
├── frontend/          Next.js application
│   ├── app/           routes (App Router)
│   ├── components/    brand, site sections, motion, ui, providers
│   ├── lib/           api client, config, motion vocabulary, i18n, accents
│   └── types/         shared TypeScript contracts
├── backend/           FastAPI application
│   ├── app/
│   │   ├── api/       routers (HTTP layer only)
│   │   ├── core/      database, logging
│   │   ├── models/     ORM models (Phase 2)
│   │   ├── schemas/    Pydantic contracts
│   │   ├── services/   business logic
│   │   └── repositories/  data access
│   ├── alembic/       migrations
│   └── tests/
├── database/init/     one-time SQL (extensions only)
├── storage/           raw + processed government documents (git-ignored)
├── docs/              architecture and engineering contracts
├── PROJECT_RULES.md   binding engineering rules
└── TASKS.md           phase checklist
```

---

## Local setup

### 0. Prerequisites

Node.js 20+, Python 3.11+, PostgreSQL 16 + PostGIS (local install or managed), Git.

### 1. Environment

```powershell
Copy-Item .env.example .env
Copy-Item frontend\.env.local.example frontend\.env.local
```

Then edit `.env` and set a local `POSTGRES_PASSWORD`.

### 2. Database

**Option A — local PostgreSQL 16 + PostGIS (preferred for geo analytics).**
Install PostgreSQL 16, enable PostGIS, then create:

- database: `nitidrishti_dev`
- user: `nitidrishti`
- host: `localhost:5432`

Put those values in `.env` (`POSTGRES_*`). Then enable extensions once:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m scripts.init_extensions
```

**Option B — managed PostgreSQL.** Create a project (for example Neon), copy its
connection string, and put it in `.env`:

```
DATABASE_URL=postgresql://user:password@ep-xxxx.region.aws.neon.tech/nitidrishti
```

The driver prefix and `sslmode` are added automatically. Then run the same
`python -m scripts.init_extensions` command.

### 3. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Verify: <http://localhost:8000/health> and <http://localhost:8000/docs>

### 4. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>. The emblem boot sequence plays once per browser
session and hands the logo over to the header; press **Skip** to bypass it.

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

---

## Checks

```powershell
# backend
cd backend; pytest; ruff check .

# frontend
cd frontend; npm run typecheck; npm run lint; npm run build
```

---

## Where the data comes from

| Source form | How it is read |
|---|---|
| Static HTML pages | requests + BeautifulSoup |
| JavaScript-rendered pages | Playwright |
| Official PDFs | PyMuPDF |
| Scanned PDFs | OCR (Tesseract, Hindi + English) |
| CSV / Excel / XML / JSON | Pandas / stdlib parsers |
| Restricted data only | official government API, where no permitted method exists |

Every stored record keeps its source URL, source document, retrieval time and
version number, so anything shown to a citizen can be traced back.

---

## Roadmap

Phases 0–22 are defined in the implementation roadmap: foundation → architecture →
database → backend core → auth/RBAC → frontend shell → source registry → first real
pipeline → data quality → explore layer → eligibility engine → profile intelligence →
opportunities → Nyay-Mitra → policy diff → alerts → CSC & analytics → semantic search
& RAG → PWA/offline → polish → testing & security → native production processes → final integration.

`TASKS.md` tracks the active phase.
