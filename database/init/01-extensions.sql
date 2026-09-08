-- Runs once when the PostgreSQL data directory is first created.
-- Extensions only. Tables are owned by Alembic migrations (Phase 2).

-- Geographic analytics for the district cockpit (Phase 16)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Fuzzy matching used by deduplication (Phase 8)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Accent/diacritic-insensitive search for bilingual text (Phase 9)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Note: pgvector (semantic search, Phase 17) needs an image that ships it.
-- At that phase we switch to a custom Postgres image and add:
--   CREATE EXTENSION IF NOT EXISTS vector;
