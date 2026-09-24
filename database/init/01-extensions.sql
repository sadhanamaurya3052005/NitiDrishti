-- Runs once when the PostgreSQL data directory is first created.
-- Extensions only. Tables are owned by Alembic migrations (Phase 2).
-- Native PostgreSQL 18 (this project) does not require PostGIS or pgvector.

-- Fuzzy matching used by deduplication (Phase 8) — REQUIRED
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Accent/diacritic-insensitive search for bilingual text (Phase 9) — REQUIRED
CREATE EXTENSION IF NOT EXISTS unaccent;

-- PostGIS is OPTIONAL / FUTURE / NOT REQUIRED for current deployment.
-- Analytics and welfare maps join bundled TopoJSON by district + state name.
-- Do not install PostGIS just to silence a warning. Native Postgres 18 here
-- does not include it. Uncomment only if you later add server-side geography:
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- pgvector is OPTIONAL / FUTURE (semantic search). document_embeddings is a
-- reserved table without a VECTOR column. Native Postgres 18 does not ship it.
-- CREATE EXTENSION IF NOT EXISTS vector;
