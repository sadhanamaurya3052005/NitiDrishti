"""Enable the PostgreSQL extensions NitiDrishti relies on.

Run once against the database in `.env` (local PostgreSQL or a managed URL):

    python -m scripts.init_extensions

Safe to re-run: every statement is IF NOT EXISTS, and extensions the provider
does not offer are reported and skipped rather than failing the whole run.
"""

from __future__ import annotations

import sys

from sqlalchemy import text

from app.config import settings
from app.core.database import engine

# (extension, why we need it, required?)
EXTENSIONS: list[tuple[str, str, bool]] = [
    ("postgis", "district geometry for the analytics cockpit", False),
    ("pg_trgm", "fuzzy title matching during deduplication", True),
    ("unaccent", "accent-insensitive bilingual search", True),
    ("vector", "semantic search embeddings", False),
]


def main() -> int:
    print(f"Target database: {settings.database_host_label}\n")
    failures: list[str] = []

    for name, purpose, required in EXTENSIONS:
        try:
            with engine.begin() as connection:
                connection.execute(text(f"CREATE EXTENSION IF NOT EXISTS {name}"))
            print(f"  [ok]   {name:<8} {purpose}")
        except Exception as exc:  # reported per extension, never fatal on its own
            marker = "FAIL" if required else "skip"
            print(f"  [{marker}] {name:<8} {type(exc).__name__}: {purpose}")
            if required:
                failures.append(name)

    with engine.connect() as connection:
        installed = connection.execute(
            text("SELECT extname FROM pg_extension ORDER BY extname")
        ).scalars()
        print("\nInstalled extensions:", ", ".join(installed))

    if failures:
        print(f"\nRequired extensions missing: {', '.join(failures)}")
        return 1

    print("\nDatabase is ready for Alembic migrations.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
