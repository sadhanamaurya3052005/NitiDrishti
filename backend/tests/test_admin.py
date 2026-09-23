"""ADMIN console: guest 401, citizen/officer 403, last ADMIN stays."""

from __future__ import annotations

import json
import uuid
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, inspect, select

from app.core.database import SessionLocal, check_connection, engine
from app.main import app
from app.models.actions import ActionDossier, Alert
from app.models.applications import Application
from app.models.identity import Role, User, UserProfile, UserRole
from app.services.auth.service import table_counts

_SEED_ROLES = (
    ("CITIZEN", "Citizen", "नागरिक"),
    ("CSC_OPERATOR", "CSC operator", "CSC संचालक"),
    ("WELFARE_OFFICER", "Welfare officer", "कल्याण अधिकारी"),
    ("ADMIN", "Administrator", "प्रशासक"),
)


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
        for code, name, name_hi in _SEED_ROLES:
            if session.scalar(select(Role).where(Role.code == code)) is None:
                session.add(Role(code=code, name=name, name_hi=name_hi))
        session.commit()
    finally:
        session.close()
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


def _email(prefix: str = "admin") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}@example.com"


def _cleanup(*emails: str) -> None:
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
            session.delete(user)
        session.commit()
    finally:
        session.close()


def _register(client: TestClient, email: str, display_name: str = "Admin tester") -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "test-pass-12", "display_name": display_name},
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]


def _promote(email: str, code: str) -> None:
    session = SessionLocal()
    try:
        user = session.scalar(select(User).where(User.email == email))
        role = session.scalar(select(Role).where(Role.code == code))
        assert user is not None and role is not None
        existing = session.scalar(
            select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == role.id)
        )
        if existing is None:
            session.add(UserRole(user_id=user.id, role_id=role.id))
            session.commit()
    finally:
        session.close()


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_guest_cannot_read_admin_console(client: TestClient) -> None:
    session = SessionLocal()
    try:
        before = table_counts(session)
        listed = client.get("/api/v1/admin/users")
        flags = client.get("/api/v1/admin/flags")
        audit = client.get("/api/v1/admin/audit")
        patched = client.patch(
            f"/api/v1/admin/users/{uuid.uuid4()}/roles",
            json={"roles": ["CSC_OPERATOR"]},
        )
        after = table_counts(session)
        assert listed.status_code == 401
        assert flags.status_code == 401
        assert audit.status_code == 401
        assert patched.status_code == 401
        assert listed.json()["error"]["code"] == "AUTH_ERROR"
        assert before == after
    finally:
        session.close()


def test_citizen_and_officer_cannot_assign_roles(client: TestClient) -> None:
    citizen_email = _email("cit")
    officer_email = _email("off")
    try:
        citizen = _register(client, citizen_email)
        officer = _register(client, officer_email)
        _promote(officer_email, "WELFARE_OFFICER")
        for token in (citizen["access_token"], officer["access_token"]):
            listed = client.get("/api/v1/admin/users", headers=_headers(token))
            patched = client.patch(
                f"/api/v1/admin/users/{citizen['user']['id']}/roles",
                headers=_headers(token),
                json={"roles": ["CSC_OPERATOR"]},
            )
            assert listed.status_code == 403
            assert patched.status_code == 403
            assert listed.json()["error"]["code"] == "PERMISSION_ERROR"
    finally:
        _cleanup(citizen_email, officer_email)


def test_admin_lists_masked_users_without_profile(client: TestClient) -> None:
    admin_email = _email("adm")
    other_email = _email("oth")
    try:
        admin = _register(client, admin_email, "Console admin")
        _register(client, other_email, "Directory citizen")
        _promote(admin_email, "ADMIN")
        listed = client.get(
            "/api/v1/admin/users",
            headers=_headers(admin["access_token"]),
            params={"email": other_email},
        )
        assert listed.status_code == 200, listed.text
        body = listed.json()
        assert body["success"] is True
        items = body["data"]["items"]
        assert len(items) == 1
        row = items[0]
        assert row["email_masked"] == f"{other_email[0]}***@example.com"
        assert other_email not in json.dumps(body)
        assert "profile" not in row
        assert "password" not in json.dumps(body)
        assert row["roles"] == ["CITIZEN"]
        assert row["is_active"] is True
    finally:
        _cleanup(admin_email, other_email)


def test_admin_assigns_role_and_writes_audit(client: TestClient) -> None:
    admin_email = _email("adm")
    citizen_email = _email("cit")
    try:
        admin = _register(client, admin_email)
        citizen = _register(client, citizen_email)
        _promote(admin_email, "ADMIN")
        patched = client.patch(
            f"/api/v1/admin/users/{citizen['user']['id']}/roles",
            headers=_headers(admin["access_token"]),
            json={"roles": ["CITIZEN", "CSC_OPERATOR"]},
        )
        assert patched.status_code == 200, patched.text
        data = patched.json()["data"]
        assert set(data["roles"]) == {"CITIZEN", "CSC_OPERATOR"}
        assert citizen_email not in json.dumps(patched.json())

        audit = client.get(
            "/api/v1/admin/audit",
            headers=_headers(admin["access_token"]),
            params={"action": "role_change", "limit": 20},
        )
        assert audit.status_code == 200
        actions = audit.json()["data"]["items"]
        assert any(item["entity_id"] == citizen["user"]["id"] and "CSC_OPERATOR" in (item["detail"] or "") for item in actions)
    finally:
        _cleanup(admin_email, citizen_email)


def test_flags_are_environment_read_only(client: TestClient) -> None:
    admin_email = _email("adm")
    try:
        admin = _register(client, admin_email)
        _promote(admin_email, "ADMIN")
        flags = client.get("/api/v1/admin/flags", headers=_headers(admin["access_token"]))
        assert flags.status_code == 200, flags.text
        data = flags.json()["data"]
        assert data["writable"] is False
        assert data["source"] == "environment"
        assert data["flags"]["disaster_module"] is False
        assert "jwt_secret_is_placeholder" in data["flags"]
    finally:
        _cleanup(admin_email)


def test_last_admin_cannot_drop_admin_role(client: TestClient, monkeypatch) -> None:
    admin_email = _email("adm")
    try:
        admin = _register(client, admin_email)
        _promote(admin_email, "ADMIN")
        monkeypatch.setattr("app.services.admin.AdminService._active_admin_count", lambda self: 1)
        denied = client.patch(
            f"/api/v1/admin/users/{admin['user']['id']}/roles",
            headers=_headers(admin["access_token"]),
            json={"roles": ["CITIZEN"]},
        )
        assert denied.status_code == 409
        assert denied.json()["error"]["code"] == "BUSINESS_RULE"
    finally:
        _cleanup(admin_email)


def test_unknown_role_is_rejected(client: TestClient) -> None:
    admin_email = _email("adm")
    citizen_email = _email("cit")
    try:
        admin = _register(client, admin_email)
        citizen = _register(client, citizen_email)
        _promote(admin_email, "ADMIN")
        denied = client.patch(
            f"/api/v1/admin/users/{citizen['user']['id']}/roles",
            headers=_headers(admin["access_token"]),
            json={"roles": ["SUPERUSER"]},
        )
        assert denied.status_code == 422
    finally:
        _cleanup(admin_email, citizen_email)
