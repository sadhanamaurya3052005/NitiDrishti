"""HITL review queue: guests stay out, citizens cannot publish, officers can list."""

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
from app.models.schemes import Scheme


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
    return f"review-{uuid.uuid4().hex[:12]}@example.com"


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
        json={"email": email, "password": "test-pass-12", "display_name": "Review tester"},
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


def test_guest_cannot_read_or_act_on_review_queue(client: TestClient) -> None:
    listed = client.get("/api/v1/review/schemes")
    acted = client.post("/api/v1/review/schemes/pm-kisan", json={"action": "approve"})
    assert listed.status_code == 401
    assert acted.status_code == 401
    assert listed.json()["error"]["code"] == "AUTH_ERROR"


def test_citizen_cannot_publish_review_queue(client: TestClient) -> None:
    email = _email()
    try:
        token = _register(client, email)
        headers = {"Authorization": f"Bearer {token}"}
        listed = client.get("/api/v1/review/schemes", headers=headers)
        acted = client.post(
            "/api/v1/review/schemes/pm-kisan",
            headers=headers,
            json={"action": "approve"},
        )
        assert listed.status_code == 403
        assert acted.status_code == 403
        assert listed.json()["error"]["code"] == "PERMISSION_ERROR"
    finally:
        _cleanup(email)


def test_officer_lists_needs_review_only(client: TestClient) -> None:
    email = _email()
    try:
        token = _register(client, email)
        _promote_officer(email)
        headers = {"Authorization": f"Bearer {token}"}
        listed = client.get("/api/v1/review/schemes", headers=headers)
        assert listed.status_code == 200, listed.text
        data = listed.json()["data"]
        assert "schemes" in data
        assert data["count"] == len(data["schemes"])
        for item in data["schemes"]:
            assert item["status"] == "needs_review"
            assert "sourceUrl" in item
            assert "reasons" in item
            assert "ruleCount" in item
            assert "versionNumber" in item
    finally:
        _cleanup(email)


def test_officer_cannot_review_published_scheme(client: TestClient) -> None:
    email = _email()
    try:
        token = _register(client, email)
        _promote_officer(email)
        headers = {"Authorization": f"Bearer {token}"}
        catalog = client.get("/api/v1/schemes").json()["data"]["schemes"]
        if not catalog:
            pytest.skip("no published schemes")
        slug = catalog[0]["id"]
        acted = client.post(
            f"/api/v1/review/schemes/{slug}",
            headers=headers,
            json={"action": "approve"},
        )
        assert acted.status_code == 409
        assert acted.json()["error"]["code"] == "BUSINESS_RULE"
    finally:
        _cleanup(email)


def test_officer_approve_then_restore_needs_review(client: TestClient) -> None:
    email = _email()
    session = SessionLocal()
    row = session.scalar(select(Scheme).where(Scheme.status == "needs_review"))
    session.close()
    if row is None:
        pytest.skip("no needs_review schemes")
    slug = row.slug
    try:
        token = _register(client, email)
        _promote_officer(email)
        headers = {"Authorization": f"Bearer {token}"}
        acted = client.post(
            f"/api/v1/review/schemes/{slug}",
            headers=headers,
            json={"action": "approve"},
        )
        assert acted.status_code == 200, acted.text
        body = acted.json()["data"]
        assert body["action"] == "approve"
        assert body["status"] == "published"
    finally:
        restore = SessionLocal()
        try:
            target = restore.scalar(select(Scheme).where(Scheme.slug == slug))
            if target is not None and target.status == "published":
                target.status = "needs_review"
                restore.commit()
        finally:
            restore.close()
        _cleanup(email)
