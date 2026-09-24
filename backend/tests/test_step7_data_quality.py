"""Step 7: inactive sources stay dark; host allowlist remains fail-closed."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.exceptions import ValidationError
from app.models.ingestion import Source
from app.services.ingestion.payload import SourceSpec
from app.services.ingestion.pipeline import SchemeIngestionService
from app.services.ingestion.whitelist import assert_whitelisted


def _db_ready() -> bool:
    try:
        session = SessionLocal()
        try:
            session.execute(select(1))
            return True
        finally:
            session.close()
    except Exception:
        return False


@pytest.fixture
def session() -> Iterator[Session]:
    if not _db_ready():
        pytest.skip("PostgreSQL not available")
    session = SessionLocal()
    try:
        yield session
        session.rollback()
    finally:
        session.close()


def test_inactive_source_is_not_fetched(session: Session, monkeypatch) -> None:
    url = f"https://vikaspedia.in/step7-inactive-{uuid4().hex}"
    source = Source(
        name="Step7 Inactive Fixture",
        source_url=url,
        domain="vikaspedia.in",
        connector_type="html",
        is_active=False,
        last_checked_at=datetime.now(UTC),
    )
    session.add(source)
    session.flush()

    called: list[str] = []

    def _boom(u: str):
        called.append(u)
        raise AssertionError("inactive source must not call retrieve")

    monkeypatch.setattr(
        "app.services.ingestion.pipeline.connector_for",
        lambda *_a, **_k: type("C", (), {"fetch": staticmethod(_boom), "parse": staticmethod(lambda p: p)})(),
    )

    result = SchemeIngestionService(session, retrieve_fn=_boom).ingest_source(
        SourceSpec(name="Step7 Inactive Fixture", url=url, connector_type="html", category="general")
    )
    assert result.status == "failed"
    assert result.error_code == "SOURCE_INACTIVE"
    assert called == []
    refreshed = session.scalar(select(Source).where(Source.source_url == url))
    assert refreshed is not None
    assert refreshed.is_active is False


def test_redirect_escape_host_rejected_by_whitelist() -> None:
    with pytest.raises(ValidationError):
        assert_whitelisted("https://evil.example/escape")
