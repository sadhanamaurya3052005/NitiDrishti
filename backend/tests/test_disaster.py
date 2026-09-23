"""Disaster DSS: flag-off stays empty, guests write nothing, catalog rows only."""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, inspect, select

from app.config import settings
from app.core.database import SessionLocal, check_connection, engine
from app.main import app
from app.models.actions import ActionDossier, Alert, AuditLog
from app.models.applications import Application
from app.models.identity import Role, User, UserProfile, UserRole
from app.models.schemes import Scheme, SchemeVersion
from app.services.auth.service import table_counts

_SEED_ROLES = (
    ("CITIZEN", "Citizen", "नागरिक"),
    ("WELFARE_OFFICER", "Welfare officer", "कल्याण अधिकारी"),
)


def _db_ready() -> bool:
    if not check_connection()["connected"]:
        return False
    inspector = inspect(engine)
    return inspector.has_table("users") and inspector.has_table("schemes")


@pytest.fixture
def client() -> Iterator[TestClient]:
    if not _db_ready():
        pytest.skip("PostgreSQL production schema is not available")
    session = SessionLocal()
    try:
        for code, name, name_hi in _SEED_ROLES:
            if session.scalar(select(Role).where(Role.code == code)) is None:
                session.add(Role(code=code, name=name, name_hi=name_hi))
        session.commit()
    finally:
        session.close()
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


def _email(prefix: str = "dss") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}@example.com"


def _cleanup_user(*emails: str) -> None:
    session = SessionLocal()
    try:
        for email in emails:
            user = session.scalar(select(User).where(User.email == email))
            if user is None:
                continue
            session.execute(delete(Alert).where(Alert.user_id == user.id))
            session.execute(delete(ActionDossier).where(ActionDossier.user_id == user.id))
            session.execute(delete(Application).where(Application.user_id == user.id))
            session.execute(delete(UserProfile).where(UserProfile.user_id == user.id))
            session.execute(delete(UserRole).where(UserRole.user_id == user.id))
            session.execute(delete(AuditLog).where(AuditLog.actor_user_id == user.id))
            session.delete(user)
        session.commit()
    finally:
        session.close()


def _cleanup_scheme(slug: str) -> None:
    session = SessionLocal()
    try:
        scheme = session.scalar(select(Scheme).where(Scheme.slug == slug))
        if scheme is None:
            return
        scheme.current_version_id = None
        session.flush()
        session.execute(delete(SchemeVersion).where(SchemeVersion.scheme_id == scheme.id))
        session.delete(scheme)
        session.commit()
    finally:
        session.close()


def _publish_disaster(slug: str) -> None:
    session = SessionLocal()
    try:
        scheme = Scheme(slug=slug, category="disaster", status="published")
        session.add(scheme)
        session.flush()
        version = SchemeVersion(
            scheme_id=scheme.id,
            version_number=1,
            name="Catalog Relief Test",
            name_hi="कैटलॉग राहत परीक्षण",
            summary="Official ingested test row for disaster DSS.",
            summary_hi="आपदा DSS के लिए आधिकारिक परीक्षण पंक्ति।",
            source_url="https://ndma.gov.in/catalog-relief-test",
            retrieved_at=datetime.now(UTC),
        )
        session.add(version)
        session.flush()
        scheme.current_version_id = version.id
        session.commit()
    finally:
        session.close()


def _register(client: TestClient, email: str) -> str:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "test-pass-12", "display_name": "DSS tester"},
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]["access_token"]


def _promote_officer(email: str) -> None:
    session = SessionLocal()
    try:
        user = session.scalar(select(User).where(User.email == email))
        role = session.scalar(select(Role).where(Role.code == "WELFARE_OFFICER"))
        assert user is not None and role is not None
        existing = session.scalar(
            select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == role.id)
        )
        if existing is None:
            session.add(UserRole(user_id=user.id, role_id=role.id))
            session.commit()
    finally:
        session.close()


def test_flag_off_summary_has_no_fake_numbers(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(settings, "feature_disaster_module", False)
    response = client.get("/api/v1/disaster/summary")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert data["enabled"] is False
    assert data["published_count"] == 0
    assert data["schemes"] == []
    assert data["districts"] == []
    assert data["ndma_live"] is False
    assert data["postgis"] is False
    assert "flood" not in str(data).lower()
    assert "beneficiary" not in str(data).lower()


def test_guest_focus_is_401_and_writes_zero_rows(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(settings, "feature_disaster_module", True)
    session = SessionLocal()
    try:
        before = table_counts(session)
    finally:
        session.close()
    denied = client.post(
        "/api/v1/disaster/focus",
        json={"state_iso": "MH", "district_name": "Mumbai"},
    )
    assert denied.status_code == 401
    assert denied.json()["error"]["code"] == "AUTH_ERROR"
    session = SessionLocal()
    try:
        assert table_counts(session) == before
    finally:
        session.close()


def test_published_disaster_scheme_appears_when_flag_on(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(settings, "feature_disaster_module", True)
    slug = f"dss-{uuid.uuid4().hex[:10]}"
    try:
        _publish_disaster(slug)
        response = client.get("/api/v1/disaster/summary")
        assert response.status_code == 200, response.text
        data = response.json()["data"]
        assert data["enabled"] is True
        assert data["source"] == "postgres_catalog"
        assert data["geometry"] == "bundled_topojson_name_join"
        assert data["ndma_live"] is False
        assert data["postgis"] is False
        ids = [item["id"] for item in data["schemes"]]
        assert slug in ids
        assert data["published_count"] >= 1
    finally:
        _cleanup_scheme(slug)


def test_officer_focus_uses_bundled_district_name(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(settings, "feature_disaster_module", True)
    email = _email("officer")
    try:
        token = _register(client, email)
        _promote_officer(email)
        focused = client.post(
            "/api/v1/disaster/focus",
            headers={"Authorization": f"Bearer {token}"},
            json={"state_iso": "AN", "district_name": "South Andaman"},
        )
        assert focused.status_code == 200, focused.text
        data = focused.json()["data"]
        assert data["enabled"] is True
        assert data["focus"]["district_name"] == "South Andaman"
        assert data["focus"]["state_iso"] == "AN"
        assert data["districts"][0]["name"] == "South Andaman"
        assert data["postgis"] is False
    finally:
        _cleanup_user(email)


def test_flag_off_officer_focus_is_conflict(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(settings, "feature_disaster_module", False)
    email = _email("off")
    try:
        token = _register(client, email)
        _promote_officer(email)
        blocked = client.post(
            "/api/v1/disaster/focus",
            headers={"Authorization": f"Bearer {token}"},
            json={"state_iso": "AN", "district_name": "South Andaman"},
        )
        assert blocked.status_code == 409
        assert blocked.json()["error"]["code"] == "BUSINESS_RULE"
    finally:
        _cleanup_user(email)
