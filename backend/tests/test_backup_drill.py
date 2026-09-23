"""Backup-drill helpers: no passwords on argv, fail-closed if pg_dump is missing."""

from __future__ import annotations

import pytest

from scripts.backup_verify import (
    VERIFY_TABLES,
    assert_argv_hides_secret,
    dump_argv,
    find_pg_tool,
    restore_argv,
)


def test_dump_argv_does_not_include_password() -> None:
    argv = dump_argv(
        pg_dump="pg_dump",
        host="localhost",
        port=5432,
        user="nitidrishti",
        database="nitidrishti_dev",
        outfile="backup.dump",
    )
    assert argv == [
        "pg_dump",
        "-h",
        "localhost",
        "-p",
        "5432",
        "-U",
        "nitidrishti",
        "-d",
        "nitidrishti_dev",
        "-Fc",
        "-f",
        "backup.dump",
    ]
    assert_argv_hides_secret(argv, "super-secret-pass")


def test_restore_argv_does_not_include_password() -> None:
    argv = restore_argv(
        pg_restore="pg_restore",
        host="localhost",
        port=5432,
        user="nitidrishti",
        database="nitidrishti_verify",
        dumpfile="backup.dump",
    )
    assert "-d" in argv
    assert "nitidrishti_verify" in argv
    assert_argv_hides_secret(argv, "super-secret-pass")


def test_assert_argv_hides_secret_rejects_password() -> None:
    with pytest.raises(ValueError):
        assert_argv_hides_secret(["pg_dump", "-W", "super-secret-pass"], "super-secret-pass")


def test_find_pg_tool_fail_closed(monkeypatch) -> None:
    monkeypatch.setattr("scripts.backup_verify.shutil.which", lambda _name: None)
    monkeypatch.setattr("scripts.backup_verify.Path.is_file", lambda self: False)
    with pytest.raises(FileNotFoundError, match="pg_dump"):
        find_pg_tool("pg_dump")


def test_verify_tables_are_real_catalog_not_kpis() -> None:
    assert "users" in VERIFY_TABLES
    assert "schemes" in VERIFY_TABLES
    assert "alembic_version" in VERIFY_TABLES
    joined = " ".join(VERIFY_TABLES)
    assert "flood" not in joined
    assert "beneficiary" not in joined
