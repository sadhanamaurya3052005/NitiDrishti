"""Isolated POST /sources/{id}/run orchestration. Network is replaced with fixtures."""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, inspect, select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, check_connection, engine
from app.core.exceptions import NotFoundError, SourceUnavailableError
from app.main import app
from app.models.actions import ActionDossier, Alert, AuditLog
from app.models.identity import Role, User, UserProfile, UserRole
from app.models.ingestion import IngestionLog, Source, SourceDocument
from app.services.ingestion.hashing import sha256_bytes
from app.services.ingestion.payload import RawPayload, SourceSpec
from app.services.ingestion.pipeline import SchemeIngestionService
from app.services.ingestion.robots import clear_robots_cache
from app.services.ingestion.scheduler import ingest_interval_hours, start_background_scheduler
from app.services.source_control import SourceControlService

_HTML = (
    b"<!DOCTYPE html><html lang='en'><head><title>ND Isolated Fixture Scheme</title></head>"
    b"<body><article><h1>ND Isolated Fixture Scheme</h1><p>"
    b"This isolated pytest fixture describes an official gazette-style income support of Rs. 6000 "
    b"per year for landholding farmer families. Eligible cultivators must typically be age 18 or above "
    b"and the page repeats enough official prose so the extractor treats it as a substantial snapshot. "
    b"It is not a live government website crawl and must never be used as production catalog content."
    b"</p></article></body></html>"
)
_HTML_HASH = sha256_bytes(_HTML)


def _db_ready() -> bool:
    if not check_connection()["connected"]:
        return False
    inspector = inspect(engine)
    return inspector.has_table("users") and inspector.has_table("sources") and inspector.has_table("ingestion_logs")


@pytest.fixture
def client() -> Iterator[TestClient]:
    if not _db_ready():
        pytest.skip("PostgreSQL production schema is not available")
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


@pytest.fixture
def session() -> Iterator[Session]:
    if not _db_ready():
        pytest.skip("PostgreSQL production schema is not available")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


def _email() -> str:
    return f"ingest-run-{uuid.uuid4().hex[:12]}@example.com"


def _cleanup_user(email: str) -> None:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            return
        db.execute(delete(Alert).where(Alert.user_id == user.id))
        db.execute(delete(ActionDossier).where(ActionDossier.user_id == user.id))
        db.execute(delete(UserProfile).where(UserProfile.user_id == user.id))
        db.execute(delete(UserRole).where(UserRole.user_id == user.id))
        db.delete(user)
        db.commit()
    finally:
        db.close()


def _cleanup_source(url: str) -> None:
    db = SessionLocal()
    try:
        source = db.scalar(select(Source).where(Source.source_url == url))
        if source is None:
            return
        db.execute(delete(AuditLog).where(AuditLog.entity_id == str(source.id), AuditLog.action == "ingestion_run"))
        db.execute(delete(IngestionLog).where(IngestionLog.source_id == source.id))
        db.execute(delete(SourceDocument).where(SourceDocument.source_id == source.id))
        db.delete(source)
        db.commit()
    finally:
        db.close()


def _register(client: TestClient, email: str) -> str:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "test-pass-12", "display_name": "Ingest tester"},
    )
    assert response.status_code == 200, response.text
    return str(response.json()["data"]["access_token"])


def _grant(email: str, role_code: str) -> None:
    db = SessionLocal()
    try:
        if db.scalar(select(Role).where(Role.code == role_code)) is None:
            names = {
                "POLICY_ANALYST": ("Policy analyst", "नीति विश्लेषक"),
                "WELFARE_OFFICER": ("Welfare officer", "कल्याण अधिकारी"),
            }
            label = names.get(role_code)
            if label is None:
                pytest.skip(f"{role_code} is not seeded")
            db.add(Role(code=role_code, name=label[0], name_hi=label[1]))
            db.commit()
        user = db.scalar(select(User).where(User.email == email))
        role = db.scalar(select(Role).where(Role.code == role_code))
        assert user is not None and role is not None
        existing = db.scalar(select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == role.id))
        if existing is None:
            db.add(UserRole(user_id=user.id, role_id=role.id))
            db.commit()
    finally:
        db.close()


def _fixture_payload(url: str, content: bytes = _HTML) -> RawPayload:
    return RawPayload(
        url=url,
        final_url=url,
        status_code=200,
        mime_type="text/html",
        content=content,
        retrieved_at=datetime.now(UTC),
        content_hash=sha256_bytes(content),
    )


def _spec(url: str) -> SourceSpec:
    return SourceSpec(
        name="Isolated ingest fixture",
        url=url,
        connector_type="html",
        category="agriculture",
        slug=f"nd-ingest-{uuid.uuid4().hex[:10]}",
        code=f"ND-INGEST-{uuid.uuid4().hex[:6].upper()}",
    )


def test_scheduler_interval_and_test_process_stay_intact() -> None:
    assert ingest_interval_hours() >= 1
    assert start_background_scheduler() is None


def test_pipeline_success_robots_fetch_malformed_and_dedup(session: Session, monkeypatch, tmp_path: Path) -> None:
    url = f"https://vikaspedia.in/nd-ingest-orchestrate-{uuid.uuid4().hex}"
    monkeypatch.setattr(
        "app.services.ingestion.pipeline.persist_snapshot",
        lambda _sid, payload: str(tmp_path / f"{payload.content_hash}.html"),
    )
    service = SchemeIngestionService(session, retrieve_fn=lambda target: _fixture_payload(target))
    spec = _spec(url)
    first = service.ingest_source(spec)
    second = service.ingest_source(spec)
    assert first.status == "ok"
    assert first.content_hash == _HTML_HASH
    assert first.rows_upserted >= 1
    assert second.status == "ok"
    assert second.unchanged is True
    assert second.rows_upserted == 0
    assert second.content_hash == _HTML_HASH

    def boom(_url: str) -> RawPayload:
        raise SourceUnavailableError("HTTP 503 fixture")

    failed = SchemeIngestionService(session, retrieve_fn=boom).ingest_source(_spec(f"{url}-fail"))
    assert failed.status == "failed"
    assert failed.error_code == "SOURCE_UNAVAILABLE"
    assert "secret" not in (failed.detail or "").lower()
    assert "password" not in (failed.detail or "").lower()

    malformed = SchemeIngestionService(session, retrieve_fn=lambda target: _fixture_payload(target, b"{not-html")).ingest_source(
        _spec(f"{url}-bad")
    )
    assert malformed.status in {"ok", "failed"}
    if malformed.status == "failed":
        assert malformed.error_code
        assert "traceback" not in (malformed.detail or "").lower()

    clear_robots_cache()
    with (
        patch(
            "app.services.ingestion.base.assert_robots_allowed",
            side_effect=SourceUnavailableError("robots.txt disallows fetching fixture"),
        ),
        patch("app.services.ingestion.http.requests.get") as download,
    ):
        blocked = SchemeIngestionService(session).ingest_source(_spec(f"{url}-robots"))
        assert blocked.status == "failed"
        assert blocked.error_code == "SOURCE_UNAVAILABLE"
        assert "robots" in (blocked.detail or "").lower()
        download.assert_not_called()


def test_officer_run_uses_fixture_not_live_web(client: TestClient, monkeypatch, tmp_path: Path) -> None:
    if not _db_ready():
        pytest.skip("PostgreSQL production schema is not available")
    email = _email()
    url = f"https://vikaspedia.in/nd-ingest-run-{uuid.uuid4().hex}"
    db = SessionLocal()
    try:
        leftover = list(
            db.scalars(select(Source.source_url).where(Source.source_url.contains("/nd-ingest-run-"))).all()
        )
    finally:
        db.close()
    for leftover_url in leftover:
        _cleanup_source(str(leftover_url))
    db = SessionLocal()
    try:
        before_sources = db.scalar(select(func.count()).select_from(Source)) or 0
        before_logs = db.scalar(select(func.count()).select_from(IngestionLog)) or 0
    finally:
        db.close()
    try:
        token = _register(client, email)
        _grant(email, "WELFARE_OFFICER")
        db = SessionLocal()
        try:
            source = Source(
                name="Isolated run fixture",
                source_url=url,
                domain="vikaspedia.in",
                connector_type="html",
            )
            db.add(source)
            db.commit()
            db.refresh(source)
            source_id = str(source.id)
        finally:
            db.close()

        monkeypatch.setattr(
            "app.services.ingestion.pipeline.persist_snapshot",
            lambda _sid, payload: str(tmp_path / f"{payload.content_hash}.html"),
        )

        class FixtureIngestion(SchemeIngestionService):
            def __init__(self, session: Session) -> None:
                super().__init__(session, retrieve_fn=lambda target: _fixture_payload(target))

        monkeypatch.setattr("app.services.source_control.SchemeIngestionService", FixtureIngestion)

        from sqlalchemy.orm import Session as SASession

        real_commit = SASession.commit
        try:
            SASession.commit = lambda self: None  # type: ignore[method-assign]
            with patch("requests.get") as live:
                ran = client.post(
                    f"/api/v1/sources/{source_id}/run",
                    headers={"Authorization": f"Bearer {token}"},
                )
                live.assert_not_called()
        finally:
            SASession.commit = real_commit  # type: ignore[method-assign]
        assert ran.status_code == 200, ran.text
        body = ran.json()
        assert body["success"] is True
        assert body["error"] is None
        data = body["data"]
        assert data["source_id"] == source_id
        assert data["status"] == "ok"
        assert data["rows_upserted"] >= 1
        assert "traceback" not in ran.text.lower()
        assert "test-pass-12" not in ran.text
    finally:
        _cleanup_source(url)
        _cleanup_user(email)

    db = SessionLocal()
    try:
        after_sources = db.scalar(select(func.count()).select_from(Source)) or 0
        after_logs = db.scalar(select(func.count()).select_from(IngestionLog)) or 0
    finally:
        db.close()
    assert after_sources == before_sources
    assert after_logs == before_logs


def test_analyst_cannot_rerun_source(client: TestClient) -> None:
    email = _email()
    try:
        token = _register(client, email)
        _grant(email, "POLICY_ANALYST")
        acted = client.post(
            f"/api/v1/sources/{uuid.uuid4()}/run",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert acted.status_code == 403
        assert acted.json()["error"]["code"] == "PERMISSION_ERROR"
    finally:
        _cleanup_user(email)


def test_source_control_rerun_unknown_is_not_found(session: Session) -> None:
    class _User:
        id = uuid.uuid4()

    with pytest.raises(NotFoundError):
        SourceControlService(session).rerun(str(uuid.uuid4()), user=_User(), request_id="req-test")
