"""Auth, DPDP purge, and guest = 0 server rows."""

from __future__ import annotations

import json
import uuid
from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import delete, inspect, select

from app.api.error_handlers import register_error_handlers
from app.api.routes import auth, health
from app.core.database import SessionLocal, check_connection, engine
from app.core.middleware import RequestIdMiddleware
from app.models.actions import ActionDossier, Alert, AuditLog
from app.models.identity import Role, User, UserProfile, UserRole
from app.services.auth.service import table_counts


def _auth_app() -> FastAPI:
    """Health + auth only — avoids importing ingestion connectors."""
    application = FastAPI()
    application.add_middleware(RequestIdMiddleware)
    register_error_handlers(application)
    application.include_router(health.router)
    application.include_router(auth.router)
    return application


def _db_ready() -> bool:
    if not check_connection()["connected"]:
        return False
    inspector = inspect(engine)
    return inspector.has_table("users") and inspector.has_table("roles") and inspector.has_table("audit_logs")


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
    with TestClient(_auth_app(), raise_server_exceptions=False) as test_client:
        yield test_client


def _email() -> str:
    return f"blockc-{uuid.uuid4().hex[:12]}@example.com"


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


def _register(client: TestClient, email: str, password: str = "test-pass-12") -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "display_name": "Auth tester"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["success"] is True
    assert body["error"] is None
    assert "request_id" in body
    return body["data"]


def test_register_login_me_logout_envelope(client: TestClient) -> None:
    email = _email()
    try:
        data = _register(client, email)
        assert data["user"]["roles"] == ["CITIZEN"]
        assert data["user"]["email_masked"] == f"{email[0]}***@example.com"
        assert email not in json.dumps(data)
        assert "password" not in data
        assert data["token_type"] == "bearer"
        assert data["access_token"]
        assert data["refresh_token"]

        login = client.post("/api/v1/auth/login", json={"email": email, "password": "test-pass-12"})
        assert login.status_code == 200
        token = login.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        me = client.get("/api/v1/auth/me", headers=headers)
        assert me.status_code == 200
        me_body = me.json()
        assert me_body["success"] is True
        assert me_body["data"]["roles"] == ["CITIZEN"]
        assert email not in json.dumps(me_body)

        logged_out = client.post("/api/v1/auth/logout", headers=headers)
        assert logged_out.status_code == 200
        assert logged_out.json()["data"]["logged_out"] is True
    finally:
        _cleanup(email)


def test_duplicate_email_is_conflict(client: TestClient) -> None:
    email = _email()
    try:
        _register(client, email)
        again = client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": "another-pass"},
        )
        assert again.status_code == 409
        body = again.json()
        assert body["success"] is False
        assert body["error"]["code"] == "BUSINESS_RULE"
    finally:
        _cleanup(email)


def test_refresh_issues_new_access_token(client: TestClient) -> None:
    email = _email()
    try:
        data = _register(client, email)
        refreshed = client.post("/api/v1/auth/refresh", json={"refresh_token": data["refresh_token"]})
        assert refreshed.status_code == 200
        token = refreshed.json()["data"]["access_token"]
        me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
    finally:
        _cleanup(email)


def test_me_without_token_is_auth_error(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "AUTH_ERROR"


def test_guest_traffic_inserts_zero_personal_rows(client: TestClient) -> None:
    session = SessionLocal()
    try:
        before = table_counts(session)
    finally:
        session.close()

    assert client.get("/health").status_code == 200
    assert client.get("/api/version").status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.post("/api/v1/auth/logout").status_code == 401
    assert (
        client.post(
            "/api/v1/auth/login", json={"email": "nobody@example.com", "password": "wrong-pass"}
        ).status_code
        == 401
    )
    assert (
        client.post("/api/v1/auth/register", json={"email": "not-an-email", "password": "short"}).status_code
        == 422
    )
    assert client.patch("/api/v1/auth/profile", json={"age": 30}).status_code == 401
    assert client.delete("/api/v1/auth/account").status_code == 401

    session = SessionLocal()
    try:
        after = table_counts(session)
    finally:
        session.close()

    assert after == before


def test_profile_update_and_account_purge_cascade(client: TestClient) -> None:
    email = _email()
    try:
        data = _register(client, email)
        token = data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        patched = client.patch(
            "/api/v1/auth/profile",
            headers=headers,
            json={"age": 34, "income": 120000, "notes": "aadhaar 123412341234 keep"},
        )
        assert patched.status_code == 200
        profile = patched.json()["data"]["profile"]
        assert profile["age"] == 34
        assert "notes" not in patched.json()["data"]["profile"]
        assert email not in patched.text
        assert "123412341234" not in patched.text

        user_id = uuid.UUID(str(data["user"]["id"]))
        session = SessionLocal()
        try:
            session.add(Alert(user_id=user_id, alert_type="NEW_SCHEME_MATCH", payload={}))
            session.add(ActionDossier(user_id=user_id, status="queued", scheme_name="purge-check"))
            session.commit()
            stored_notes = session.scalar(select(UserProfile.notes).where(UserProfile.user_id == user_id))
            assert stored_notes is not None
            assert "123412341234" not in stored_notes
        finally:
            session.close()

        purged = client.delete("/api/v1/auth/account", headers=headers)
        assert purged.status_code == 200
        assert purged.json()["data"]["purged"] is True

        session = SessionLocal()
        try:
            assert session.get(User, user_id) is None
            assert session.scalar(select(UserProfile).where(UserProfile.user_id == user_id)) is None
            assert session.scalar(select(Alert).where(Alert.user_id == user_id)) is None
            assert session.scalar(select(ActionDossier).where(ActionDossier.user_id == user_id)) is None
            audit = session.scalars(
                select(AuditLog).where(AuditLog.action == "profile_purge", AuditLog.entity_id == str(user_id))
            ).all()
            assert audit
            for row in audit:
                blob = " ".join(filter(None, [row.detail, row.entity_type, row.entity_id]))
                assert "test-pass-12" not in blob
                assert email not in blob
                assert "120000" not in blob
        finally:
            session.close()
    finally:
        _cleanup(email)


def test_health_and_version_stay_flat(client: TestClient) -> None:
    health = client.get("/health").json()
    version = client.get("/api/version").json()
    assert "success" not in health
    assert "success" not in version
    assert health["app"] == "NitiDrishti"


def test_login_audit_does_not_store_secrets(client: TestClient) -> None:
    email = _email()
    try:
        data = _register(client, email)
        session = SessionLocal()
        try:
            rows = session.scalars(select(AuditLog).where(AuditLog.entity_id == str(data["user"]["id"]))).all()
            assert any(row.action == "login" for row in rows)
            for row in rows:
                detail = row.detail or ""
                assert detail in {"register", "login", "logout", "account_delete"} or detail.startswith(
                    "fields="
                )
                assert "test-pass-12" not in detail
                assert data["access_token"] not in detail
        finally:
            session.close()
    finally:
        _cleanup(email)
