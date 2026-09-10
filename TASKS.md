# NitiDrishti — Task Log

## PHASE 0 — Project Foundation ✅

- [x] Repository, git on `main`, project rules, architecture notes, design-system doc
- [x] Backend: FastAPI app, settings, SQLAlchemy engine, structured logging with redaction, Alembic wired to `app.config`
- [x] Backend endpoints: `GET /health` (real database state), `GET /api/version`
- [x] Backend checks: 10 tests passing, `ruff check` clean
- [x] Frontend: Next.js 15, TypeScript strict, Tailwind design tokens, Framer Motion, Lucide
- [x] Animated emblem + cinematic boot screen handing the logo to the header via a shared layout id
- [x] Bilingual landing experience (English / Hindi) with Devanagari typography tuned
- [x] Live backend status pill, 404 and error boundary screens
- [x] Frontend checks: `tsc --noEmit`, ESLint and `next build` all clean

## PHASE 5 (early) — Application shell ✅

Built ahead of its roadmap position so the workspaces are navigable from day one.

- [x] Collapsible sidebar with the five workspaces and the locked smart-tool list
- [x] Topbar: command-palette trigger, read-aloud, live online/offline pill, language switch, role selector
- [x] Command palette (`Ctrl`/`Cmd` + `K`) with keyboard navigation
- [x] Route transitions, mobile drawer, skeleton loading state
- [x] Role preview gating: navigation locks workspaces the selected role cannot open
- [x] Honest workspace pages — purpose, planned modules, empty state; no mock dashboards
- [x] Routes: `/citizen`, `/csc`, `/nyay-mitra`, `/welfare`, `/analytics`

Deferred to the real Phase 5/4: server-enforced authorisation, session-backed role (the
selector is a preview only), per-workspace layouts once each has real content.

## PHASE 0 — remaining step: database (no Docker)

Chosen path: **native PostgreSQL 16 + PostGIS on this machine**, or a managed
Postgres URL in `DATABASE_URL` (Neon / equivalent). Docker is not used.

- [x] Backend accepts a provider connection string as-is (driver prefix + `sslmode` handled)
- [x] `backend/scripts/init_extensions.py` enables postgis, pg_trgm, unaccent, vector
- [ ] Install PostgreSQL 16 + PostGIS locally, create db `nitidrishti_dev` / user `nitidrishti`, **or** paste a managed `DATABASE_URL` into `.env`
- [ ] Run `python -m scripts.init_extensions`
- [ ] Confirm `/health` reports `status: ok`

## Next

**PHASE 1 — Architecture freeze**: `docs/api-contracts.md`, `docs/data-flow.md`,
`docs/ingestion-architecture.md`, `docs/security-architecture.md`, the role × module permission
matrix, and the standard response/error envelope. Then **PHASE 2 — database design**.
