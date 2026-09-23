"""Application submit is authenticated. Guests write zero rows. Funnel is real or null."""

from __future__ import annotations

import uuid
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, inspect, select

from app.core.database import SessionLocal, check_connection, engine
from app.main import app
from app.models.applications import Application
from app.models.identity import Role, User, UserProfile, UserRole
from app.services.auth.service import table_counts


def _db_ready() -> bool:
    if not check_connection()["connected"]:
        return False
    inspector = inspect(engine)
    return inspector.has_table("applications") and inspector.has_table("users")


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
    return f"app-{uuid.uuid4().hex[:12]}@example.com"


def _cleanup(email: str) -> None:
    session = SessionLocal()
    try:
        user = session.scalar(select(User).where(User.email == email))
        if user is None:
            return
        session.execute(delete(Application).where(Application.user_id == user.id))
        session.execute(delete(UserProfile).where(UserProfile.user_id == user.id))
        session.execute(delete(UserRole).where(UserRole.user_id == user.id))
        session.delete(user)
        session.commit()
    finally:
        session.close()


def test_guest_application_inserts_zero_rows(client: TestClient) -> None:
    session = SessionLocal()
    try:
        before = table_counts(session)
    finally:
        session.close()

    denied = client.post("/api/v1/applications", json={"scheme_id": "pm-kisan"})
    assert denied.status_code == 401
    assert denied.json()["error"]["code"] == "AUTH_ERROR"
    listed = client.get("/api/v1/applications")
    assert listed.status_code == 401
    queued = client.get("/api/v1/applications/queue")
    assert queued.status_code == 401

    session = SessionLocal()
    try:
        after = table_counts(session)
    finally:
        session.close()
    assert after["applications"] == before["applications"]
    assert after == before


def test_application_submit_feeds_funnel(client: TestClient) -> None:
    catalog = client.get("/api/v1/schemes").json()["data"]
    schemes = catalog["schemes"]
    if catalog.get("source") != "postgres" or not schemes:
        pytest.skip("No published Postgres schemes")

    email = _email()
    try:
        registered = client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": "test-pass-12", "display_name": "Applicant"},
        )
        assert registered.status_code == 200
        token = registered.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        refused = client.post(
            "/api/v1/applications",
            headers=headers,
            json={"scheme_id": schemes[0]["id"], "stage": "DBT Disbursed"},
        )
        assert refused.status_code == 422 or refused.json()["success"] is False

        created = client.post(
            "/api/v1/applications",
            headers=headers,
            json={"scheme_id": schemes[0]["id"]},
        )
        assert created.status_code == 200
        data = created.json()["data"]
        assert data["stage"] == "Submitted"
        assert "aadhaar" not in created.text.lower()

        mine = client.get("/api/v1/applications", headers=headers)
        assert any(item["id"] == data["id"] for item in mine.json()["data"]["applications"])

        summary = client.get("/api/v1/analytics/summary").json()["data"]
        assert summary["application_rows"] is True
        submitted = next(item for item in summary["funnel"] if item["stage"] == "Submitted")
        assert isinstance(submitted["count"], int)
        assert submitted["count"] >= 1
        assert summary["map"]["available"] is True
    finally:
        _cleanup(email)


def _promote_officer(email: str) -> None:
    session = SessionLocal()
    try:
        if session.scalar(select(Role).where(Role.code == "WELFARE_OFFICER")) is None:
            session.add(Role(code="WELFARE_OFFICER", name="Welfare officer", name_hi="कल्याण अधिकारी"))
            session.commit()
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


def test_citizen_cannot_record_official_stage(client: TestClient) -> None:
    catalog = client.get("/api/v1/schemes").json()["data"]
    schemes = catalog["schemes"]
    if catalog.get("source") != "postgres" or not schemes:
        pytest.skip("No published Postgres schemes")
    email = _email()
    try:
        registered = client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": "test-pass-12", "display_name": "Applicant"},
        )
        token = registered.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        created = client.post(
            "/api/v1/applications",
            headers=headers,
            json={"scheme_id": schemes[0]["id"]},
        )
        assert created.status_code == 200
        app_id = created.json()["data"]["id"]
        assert "official_apply_url" in created.json()["data"]
        denied = client.patch(
            f"/api/v1/applications/{app_id}/stage",
            headers=headers,
            json={"stage": "Tehsil Verified"},
        )
        assert denied.status_code == 403
        queued = client.get("/api/v1/applications/queue", headers=headers)
        assert queued.status_code == 403
    finally:
        _cleanup(email)


def test_officer_records_next_official_stage(client: TestClient) -> None:
    catalog = client.get("/api/v1/schemes").json()["data"]
    schemes = catalog["schemes"]
    if catalog.get("source") != "postgres" or not schemes:
        pytest.skip("No published Postgres schemes")
    citizen_email = _email()
    officer_email = _email()
    try:
        citizen = client.post(
            "/api/v1/auth/register",
            json={"email": citizen_email, "password": "test-pass-12", "display_name": "Applicant"},
        )
        officer = client.post(
            "/api/v1/auth/register",
            json={"email": officer_email, "password": "test-pass-12", "display_name": "Officer"},
        )
        _promote_officer(officer_email)
        citizen_headers = {"Authorization": f"Bearer {citizen.json()['data']['access_token']}"}
        officer_headers = {"Authorization": f"Bearer {officer.json()['data']['access_token']}"}
        created = client.post(
            "/api/v1/applications",
            headers=citizen_headers,
            json={"scheme_id": schemes[0]["id"]},
        )
        app_id = created.json()["data"]["id"]
        skipped = client.patch(
            f"/api/v1/applications/{app_id}/stage",
            headers=officer_headers,
            json={"stage": "DBT Disbursed"},
        )
        assert skipped.status_code == 422
        advanced = client.patch(
            f"/api/v1/applications/{app_id}/stage",
            headers=officer_headers,
            json={"stage": "Tehsil Verified"},
        )
        assert advanced.status_code == 200, advanced.text
        assert advanced.json()["data"]["stage"] == "Tehsil Verified"
        guest = client.patch(
            f"/api/v1/applications/{app_id}/stage",
            json={"stage": "Sanctioned"},
        )
        assert guest.status_code == 401
    finally:
        _cleanup(citizen_email)
        _cleanup(officer_email)
