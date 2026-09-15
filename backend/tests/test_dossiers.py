"""Guest dossier writes stay at zero rows. Authenticated queue is allowed."""

from __future__ import annotations

import uuid
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, inspect, select

from app.core.database import SessionLocal, check_connection, engine
from app.main import app
from app.models.actions import ActionDossier
from app.models.identity import Role, User, UserProfile, UserRole
from app.services.auth.service import table_counts


def _db_ready() -> bool:
    if not check_connection()["connected"]:
        return False
    inspector = inspect(engine)
    return inspector.has_table("action_dossiers") and inspector.has_table("users")


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
    return f"blockd-{uuid.uuid4().hex[:12]}@example.com"


def _cleanup(email: str) -> None:
    session = SessionLocal()
    try:
        user = session.scalar(select(User).where(User.email == email))
        if user is None:
            return
        session.execute(delete(ActionDossier).where(ActionDossier.user_id == user.id))
        session.execute(delete(UserProfile).where(UserProfile.user_id == user.id))
        session.execute(delete(UserRole).where(UserRole.user_id == user.id))
        session.delete(user)
        session.commit()
    finally:
        session.close()


def test_guest_dossier_inserts_zero_rows(client: TestClient) -> None:
    session = SessionLocal()
    try:
        before = table_counts(session)
    finally:
        session.close()

    denied = client.post("/api/v1/dossiers", json={"scheme_id": "pm-kisan"})
    assert denied.status_code == 401
    body = denied.json()
    assert body["success"] is False
    assert body["error"]["code"] == "AUTH_ERROR"

    listed = client.get("/api/v1/dossiers")
    assert listed.status_code == 401

    session = SessionLocal()
    try:
        after = table_counts(session)
    finally:
        session.close()
    assert after["action_dossiers"] == before["action_dossiers"]
    assert after == before


def test_signed_in_user_can_queue_dossier_for_published_scheme(client: TestClient) -> None:
    catalog = client.get("/api/v1/schemes").json()["data"]
    schemes = catalog["schemes"]
    if catalog.get("source") != "postgres" or not schemes:
        pytest.skip("No published Postgres schemes to attach a dossier to")

    email = _email()
    try:
        registered = client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": "test-pass-12", "display_name": "Dossier tester"},
        )
        assert registered.status_code == 200
        token = registered.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        created = client.post(
            "/api/v1/dossiers",
            headers=headers,
            json={"scheme_id": schemes[0]["id"]},
        )
        assert created.status_code == 200
        data = created.json()["data"]
        assert data["status"] == "queued"
        assert data["scheme_name"]
        assert "aadhaar" not in created.text.lower()

        mine = client.get("/api/v1/dossiers", headers=headers)
        assert mine.status_code == 200
        rows = mine.json()["data"]["dossiers"]
        assert any(item["id"] == data["id"] for item in rows)
    finally:
        _cleanup(email)


def test_eligibility_api_pass_fail_on_published_or_empty(client: TestClient) -> None:
    catalog = client.get("/api/v1/schemes").json()["data"]
    scheme_ids = [item["id"] for item in catalog["schemes"][:2]]
    payload = {
        "scheme_ids": scheme_ids or None,
        "profile": {
            "age": 28,
            "income": 180000,
            "land_hectares": 1.2,
            "gender": "female",
            "category": "OBC",
            "occupation": "farmer",
        },
    }
    response = client.post("/api/v1/eligibility", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    evaluations = body["data"]["evaluations"]
    assert isinstance(evaluations, list)
    for item in evaluations:
        status = item["evaluation"]["status"]
        assert status in {"ELIGIBLE", "PARTIAL_INFO", "INELIGIBLE"}
        for rule in item["evaluation"]["rules"]:
            assert rule["verdict"] in {"pass", "fail", "unknown"}
    if len(scheme_ids) >= 2:
        compared = client.post(
            "/api/v1/compare",
            json={"scheme_ids": scheme_ids[:2], "profile": payload["profile"]},
        )
        assert compared.status_code == 200
        items = compared.json()["data"]["items"]
        assert len(items) == 2
        assert "documents" in items[0]
        docs = client.get(f"/api/v1/schemes/{scheme_ids[0]}/documents")
        assert docs.status_code == 200
        for doc in docs.json()["data"]["documents"]:
            assert "id" in doc and "label" in doc
            assert "aadhaar" not in str(doc.get("id", "")).lower() or "digit" not in doc["label"].lower()
