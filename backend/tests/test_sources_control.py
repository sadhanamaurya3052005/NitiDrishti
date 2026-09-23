"""Source status is public; dead-letter and re-run stay behind officer JWT."""

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


def _db_ready() -> bool:
    if not check_connection()["connected"]:
        return False
    inspector = inspect(engine)
    return inspector.has_table("users") and inspector.has_table("ingestion_logs")


@pytest.fixture
def client() -> Iterator[TestClient]:
    if not _db_ready():
        pytest.skip("PostgreSQL production schema is not available")
    session = SessionLocal()
    try:
        if session.scalar(select(Role).where(Role.code == "CITIZEN")) is None:
            session.add(Role(code="CITIZEN", name="Citizen", name_hi="नागरिक"))
            session.commit()
        if session.scalar(select(Role).where(Role.code == "WELFARE_OFFICER")) is None:
            session.add(Role(code="WELFARE_OFFICER", name="Welfare officer", name_hi="कल्याण अधिकारी"))
            session.commit()
    finally:
        session.close()
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


def _email() -> str:
    return f"pipeline-{uuid.uuid4().hex[:12]}@example.com"


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


def _register(client: TestClient, email: str) -> str:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "test-pass-12", "display_name": "Pipeline tester"},
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


def test_source_status_is_batch_not_live_feed(client: TestClient) -> None:
    response = client.get("/api/v1/sources/status")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["live_feed"] is False
    assert "sources" in data
    assert data["interval_hours"] >= 1
    assert "scheduler_enabled" in data


def test_guest_cannot_read_dead_letter_or_rerun(client: TestClient) -> None:
    listed = client.get("/api/v1/sources/dead-letter")
    acted = client.post(f"/api/v1/sources/{uuid.uuid4()}/run")
    assert listed.status_code == 401
    assert acted.status_code == 401
    assert listed.json()["error"]["code"] == "AUTH_ERROR"


def test_citizen_cannot_read_dead_letter_or_rerun(client: TestClient) -> None:
    email = _email()
    try:
        token = _register(client, email)
        headers = {"Authorization": f"Bearer {token}"}
        listed = client.get("/api/v1/sources/dead-letter", headers=headers)
        acted = client.post(f"/api/v1/sources/{uuid.uuid4()}/run", headers=headers)
        assert listed.status_code == 403
        assert acted.status_code == 403
        assert listed.json()["error"]["code"] == "PERMISSION_ERROR"
    finally:
        _cleanup(email)


def test_officer_lists_dead_letter_without_crawling(client: TestClient) -> None:
    email = _email()
    try:
        token = _register(client, email)
        _promote_officer(email)
        headers = {"Authorization": f"Bearer {token}"}
        listed = client.get("/api/v1/sources/dead-letter", headers=headers)
        assert listed.status_code == 200, listed.text
        items = listed.json()["data"]["items"]
        assert isinstance(items, list)
        for item in items:
            assert "log_id" in item
            assert "status" in item
            assert "detail" in item
            assert item["status"] == "failed"
    finally:
        _cleanup(email)


def test_officer_rerun_unknown_source_is_not_found(client: TestClient) -> None:
    email = _email()
    try:
        token = _register(client, email)
        _promote_officer(email)
        headers = {"Authorization": f"Bearer {token}"}
        acted = client.post(f"/api/v1/sources/{uuid.uuid4()}/run", headers=headers)
        assert acted.status_code == 404
        assert acted.json()["error"]["code"] == "NOT_FOUND"
    finally:
        _cleanup(email)
