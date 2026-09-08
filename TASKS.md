# NitiDrishti — Task Log

## PHASE 0 — Project Foundation

### Done

- [x] Repository created, git initialised on `main`, first commit made
- [x] `README.md`, `PROJECT_RULES.md`, `ARCHITECTURE.md`, `docs/design-system.md`, `.env.example`, `.gitignore`
- [x] Backend: FastAPI app, settings loader, SQLAlchemy engine + declarative base, structured logging with redaction, Alembic wired to `app.config`
- [x] Backend endpoints: `GET /health` (reports real database state), `GET /api/version`
- [x] Backend checks: 4 tests passing, `ruff check` clean
- [x] Frontend: Next.js 15 + TypeScript strict + Tailwind design tokens + Framer Motion + Lucide
- [x] Design system: ivory/navy palette, accent-per-category, card/panel/chip/skeleton primitives, shared motion vocabulary
- [x] Animated NitiDrishti emblem (civic shield + drishti eye + rotating chakra scan ring)
- [x] Cinematic boot screen with real progress telemetry, handing the emblem to the header via a shared layout id
- [x] Bilingual landing experience (English + Hindi), locale persisted, Devanagari typography tuned
- [x] Live backend status pill (honest `ok` / `database down` / `unreachable` states)
- [x] 404 and error boundary screens
- [x] Frontend checks: `tsc --noEmit` clean, ESLint clean, `next build` succeeds

### Blocked / pending decision

- [ ] PostgreSQL + PostGIS running locally — **Docker is not installed on this machine**.
      Choose one: install Docker Desktop, install PostgreSQL 16 + PostGIS natively, or use a
      managed free Postgres. `docker-compose.yml` and `database/init/01-extensions.sql` are ready
      for the Docker path.
- [ ] `/health` reporting `status: ok` with `postgis_enabled: true` (needs the database above)
- [ ] `.env` created from `.env.example` with a real local password

### Verified state

```
frontend  http://localhost:3000   boot screen -> landing, EN/HI switch working
backend   http://localhost:8000   /health -> status "degraded" (API up, database not running)
```

## Next

**PHASE 1 — Architecture freeze & engineering contracts**: write `docs/architecture.md`,
`data-flow.md`, `api-contracts.md`, `ingestion-architecture.md`, `security-architecture.md`;
freeze the role x module permission matrix and the standard API response/error envelope.
