"""Drop leftover empty stub tables so the first Alembic revision can create production tables.

Only drops tables that do not match the production schema (or the unused `documents` stub).
Does not drop a production `users` / `schemes` table that already has the new columns.
"""

from __future__ import annotations

from sqlalchemy import inspect, text

from app.config import settings
from app.core.database import engine


def _columns(inspector, table: str) -> set[str]:
    if table not in inspector.get_table_names():
        return set()
    return {col["name"] for col in inspector.get_columns(table)}


def _is_stub(inspector, table: str) -> bool:
    cols = _columns(inspector, table)
    if not cols:
        return False
    if table == "documents":
        return True
    if table == "users":
        return "password_hash" not in cols
    if table == "schemes":
        return "current_version_id" not in cols
    return table == "alembic_version"


def main() -> None:
    print(f"Target database: {settings.database_host_label}")
    inspector = inspect(engine)
    existing = inspector.get_table_names()
    print("public tables before:", ", ".join(existing) or "(none)")

    dropped: list[str] = []
    with engine.begin() as connection:
        if "alembic_version" in existing:
            rows = list(connection.execute(text("SELECT version_num FROM alembic_version")))
            if rows:
                print("alembic_version has a revision; leaving it in place")
            else:
                connection.execute(text("DROP TABLE IF EXISTS alembic_version"))
                dropped.append("alembic_version")

        inspector = inspect(connection)
        for table in ("documents", "users", "schemes"):
            if table in inspector.get_table_names() and _is_stub(inspector, table):
                connection.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
                dropped.append(table)

    inspector = inspect(engine)
    print("dropped stubs:", ", ".join(dropped) or "(none)")
    print("public tables after:", ", ".join(inspector.get_table_names()) or "(none)")


if __name__ == "__main__":
    main()
