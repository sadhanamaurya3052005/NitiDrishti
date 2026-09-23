"""Helpers for the Windows pg_dump / pg_restore drill. Passwords stay in env."""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path

from sqlalchemy import text

VERIFY_TABLES = ("users", "schemes", "scheme_versions", "alembic_version")


def find_pg_tool(name: str) -> str:
    """Locate pg_dump / pg_restore. Fail-closed if the client tools are missing."""
    found = shutil.which(name)
    if found:
        return found
    home = Path(os.environ.get("PROGRAMFILES", r"C:\Program Files"))
    for version in ("18", "17", "16"):
        candidate = home / "PostgreSQL" / version / "bin" / f"{name}.exe"
        if candidate.is_file():
            return str(candidate)
    raise FileNotFoundError(
        f"{name} is not on PATH. Install native PostgreSQL client tools (this project does not use Docker)."
    )


def dump_argv(
    *,
    pg_dump: str,
    host: str,
    port: str | int,
    user: str,
    database: str,
    outfile: str,
) -> list[str]:
    return [pg_dump, "-h", host, "-p", str(port), "-U", user, "-d", database, "-Fc", "-f", outfile]


def restore_argv(
    *,
    pg_restore: str,
    host: str,
    port: str | int,
    user: str,
    database: str,
    dumpfile: str,
) -> list[str]:
    return [
        pg_restore,
        "-h",
        host,
        "-p",
        str(port),
        "-U",
        user,
        "-d",
        database,
        "--clean",
        "--if-exists",
        dumpfile,
    ]


def assert_argv_hides_secret(argv: list[str], password: str | None) -> None:
    if password and password in " ".join(argv):
        raise ValueError("password must not appear on the command line")


def alembic_current(session) -> str | None:
    return session.execute(text("SELECT version_num FROM alembic_version")).scalar()


def verify_payload(session) -> dict:
    counts: dict[str, int] = {}
    for table in VERIFY_TABLES:
        if table == "alembic_version":
            continue
        counts[table] = int(session.execute(text(f"SELECT count(*) FROM {table}")).scalar_one())
    revision = alembic_current(session)
    return {
        "alembic_current": revision,
        "tables": counts,
        "ok": revision is not None,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Check table counts / alembic current after a restore.")
    parser.parse_args(argv)
    os.environ.pop("CURL_CA_BUNDLE", None)
    from app.core.database import SessionLocal, check_connection

    if not check_connection()["connected"]:
        print("database unreachable", file=sys.stderr)
        return 1
    session = SessionLocal()
    try:
        payload = verify_payload(session)
    finally:
        session.close()
    print(f"alembic_current={payload['alembic_current']}")
    for name, count in payload["tables"].items():
        print(f"{name}={count}")
    return 0 if payload["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
