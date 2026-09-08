"""A managed provider's connection string must work when pasted unchanged."""

from __future__ import annotations

from app.config import normalise_database_url


def test_adds_driver_to_plain_postgresql_url() -> None:
    url = normalise_database_url("postgresql://user:pw@localhost:5432/nitidrishti")
    assert url.startswith("postgresql+psycopg://")


def test_accepts_legacy_postgres_scheme() -> None:
    url = normalise_database_url("postgres://user:pw@localhost:5432/nitidrishti")
    assert url.startswith("postgresql+psycopg://")


def test_leaves_explicit_driver_untouched() -> None:
    original = "postgresql+psycopg://user:pw@localhost:5432/nitidrishti"
    assert normalise_database_url(original) == original


def test_requires_tls_for_managed_hosts() -> None:
    url = normalise_database_url("postgresql://user:pw@ep-cool-1.aws.neon.tech/nitidrishti")
    assert "sslmode=require" in url


def test_does_not_duplicate_existing_sslmode() -> None:
    url = normalise_database_url(
        "postgresql://user:pw@ep-cool-1.aws.neon.tech/nitidrishti?sslmode=verify-full"
    )
    assert url.count("sslmode=") == 1


def test_local_host_is_not_forced_to_tls() -> None:
    url = normalise_database_url("postgresql://user:pw@localhost:5432/nitidrishti")
    assert "sslmode" not in url
