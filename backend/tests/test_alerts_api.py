"""Alerts: authenticated only, guest inserts stay at zero."""

from __future__ import annotations

import uuid
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, inspect, select

from app.core.database import SessionLocal, check_connection, engine
from app.main import app
from app.models.actions import ActionDossier, Alert
from app.models.identity import Role, User, UserProfile, UserRole
from app.services.auth.service import table_counts


def _db_ready() -> bool:
    if not check_connection()["connected"]:
        return False
    inspector = inspect(engine)
    return inspector.has_table("users") and inspector.has_table("alerts")


@pytest.fixture
def client() -> Iterator[TestClient]:
    if not _db_ready():
        pytest.skip("PostgreSQL production schema is not available")
    session = SessionLocal()
    try:
        if session.scalar(select(Role).where(Role.code == "CITIZEN")) is None:
            session.add(Role(code="CITIZEN", name="Citizen", name_hi="नागरिक"))
            session.commit()
    finally:
        session.close()
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


def _email() -> str:
    return f"blocke-{uuid.uuid4().hex[:12]}@example.com"


def _cleanup(email: str) -> None:
    session = SessionLocal()
    try:
        user = session.scalar(select(User).where(User.email == email))
        if user is None:
            return
        session.execute(delete(Alert).where(Alert.user_id == user.id))
        session.execute(delete(ActionDossier).where(ActionDossier.user_id == user.id))
        session.execute(delete(UserProfile).where(UserProfile.user_id == user.id))
        session.execute(delete(UserRole).where(UserRole.user_id == user.id))
        session.delete(user)
        session.commit()
    finally:
        session.close()


def test_guest_cannot_read_or_write_alerts(client: TestClient) -> None:
    session = SessionLocal()
    try:
        before = table_counts(session)
    finally:
        session.close()

    listed = client.get("/api/v1/alerts")
    created = client.post("/api/v1/alerts", json={"alert_type": "NEW_SCHEME_MATCH"})
    scanned = client.post("/api/v1/alerts/scan-published")
    assert listed.status_code == 401
    assert created.status_code == 401
    assert scanned.status_code == 401
    assert listed.json()["error"]["code"] == "AUTH_ERROR"

    session = SessionLocal()
    try:
        after = table_counts(session)
    finally:
        session.close()
    assert after == before


def test_user_can_create_list_and_mark_read(client: TestClient) -> None:
    email = _email()
    try:
        register = client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": "test-pass-12", "display_name": "Alert tester"},
        )
        assert register.status_code == 200, register.text
        token = register.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        created = client.post(
            "/api/v1/alerts",
            headers=headers,
            json={"alert_type": "DEADLINE_APPROACHING", "payload": {"note": "watch this window"}},
        )
        assert created.status_code == 200, created.text
        alert = created.json()["data"]["alert"]
        assert alert["alert_type"] == "DEADLINE_APPROACHING"
        assert alert["read_at"] is None
        assert "123412341234" not in created.text

        listed = client.get("/api/v1/alerts", headers=headers)
        assert listed.status_code == 200
        rows = listed.json()["data"]["alerts"]
        assert any(item["id"] == alert["id"] for item in rows)

        duplicate = client.post(
            "/api/v1/alerts",
            headers=headers,
            json={"alert_type": "DEADLINE_APPROACHING"},
        )
        assert duplicate.status_code == 409

        read = client.post(f"/api/v1/alerts/{alert['id']}/read", headers=headers)
        assert read.status_code == 200
        assert read.json()["data"]["alert"]["read_at"] is not None

        bogus = client.post(
            "/api/v1/alerts",
            headers=headers,
            json={"alert_type": "NEW_SCHEME_MATCH", "scheme_id": str(uuid.uuid4())},
        )
        assert bogus.status_code == 404
    finally:
        _cleanup(email)


def test_scan_published_only_uses_real_scheme_rows(client: TestClient) -> None:
    email = _email()
    try:
        register = client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": "test-pass-12", "display_name": "Alert scan"},
        )
        token = register.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        scanned = client.post("/api/v1/alerts/scan-published", headers=headers)
        assert scanned.status_code == 200
        data = scanned.json()["data"]
        assert data["created"] >= 0
        for alert in data["alerts"]:
            if alert["alert_type"] == "NEW_SCHEME_MATCH":
                assert "Eligibility is not decided here" in str(alert["payload"])
    finally:
        _cleanup(email)
