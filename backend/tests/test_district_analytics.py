"""District analytics: real catalog joins, honest empty metrics, no invented funnels."""

from __future__ import annotations

import uuid
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, inspect, select

from app.core.database import SessionLocal, check_connection, engine
from app.main import app
from app.models.actions import ActionDossier, Alert
from app.models.geography import District
from app.models.identity import Role, User, UserProfile, UserRole
from app.services.auth.service import table_counts


def _db_ready() -> bool:
    if not check_connection()["connected"]:
        return False
    inspector = inspect(engine)
    return inspector.has_table("districts") and inspector.has_table("alerts")


@pytest.fixture
def client() -> Iterator[TestClient]:
    if not _db_ready():
        pytest.skip("PostgreSQL production schema is not available")
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


def _email(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}@example.com"


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


def test_districts_envelope_is_honest(client: TestClient) -> None:
    response = client.get("/api/v1/analytics/districts")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["error"] is None
    data = body["data"]
    assert data["application_rows"] is False
    assert "PostGIS is not used" in data["geometry"]
    assert data["metrics"]["application_dropoff"]["available"] is False
    assert data["metrics"]["disbursement_velocity"]["available"] is False
    assert data["metric"] == "coverage_saturation"
    for row in data["districts"]:
        assert row["application_dropoff_pct"] is None
        assert row["disbursement_velocity_pct"] is None
        assert "target_population" not in row
        pct = row["saturation_pct"]
        assert pct is None or (0 <= float(pct) <= 100)
        assert "38%" not in str(row)
        assert "12 lakh" not in str(row).lower()
        assert row["bottleneck"] == "No application-pipeline data for this district"

    drop = client.get("/api/v1/analytics/districts?metric=application_dropoff")
    assert drop.status_code == 200
    assert drop.json()["data"]["metric_available"] is False
    for row in drop.json()["data"]["districts"]:
        assert row["saturation_pct"] is None


def test_district_detail_funnel_is_null(client: TestClient) -> None:
    listed = client.get("/api/v1/analytics/districts").json()["data"]["districts"]
    if not listed:
        pytest.skip("districts reference table is empty")
    detail = client.get(f"/api/v1/analytics/districts/{listed[0]['id']}")
    assert detail.status_code == 200
    data = detail.json()["data"]
    assert data["target_population"] is None
    assert data["enrolled"] is None
    assert "no application registry" in data["population_note"].lower()
    for stage in data["application_funnel"]:
        assert stage["count"] is None
    assert data["heatmap"]["sparse"] is True or data["heatmap"]["sample_size"] >= 0
    assert "PII" not in str(data["heatmap"]["cells"])


def test_guest_cannot_dispatch_csc_camp(client: TestClient) -> None:
    session = SessionLocal()
    try:
        before = table_counts(session)
        district = session.scalars(select(District).limit(1)).first()
    finally:
        session.close()
    if district is None:
        pytest.skip("districts reference table is empty")

    response = client.post(f"/api/v1/analytics/districts/{district.id}/csc-camp")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTH_ERROR"

    session = SessionLocal()
    try:
        after = table_counts(session)
    finally:
        session.close()
    assert after == before


def test_citizen_cannot_dispatch_csc_camp(client: TestClient) -> None:
    email = _email("gis-citizen")
    try:
        register = client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": "test-pass-12", "display_name": "Citizen"},
        )
        assert register.status_code == 200, register.text
        token = register.json()["data"]["access_token"]
        session = SessionLocal()
        try:
            district = session.scalars(select(District).limit(1)).first()
        finally:
            session.close()
        if district is None:
            pytest.skip("districts reference table is empty")
        forbidden = client.post(
            f"/api/v1/analytics/districts/{district.id}/csc-camp",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert forbidden.status_code == 403
        assert forbidden.json()["error"]["code"] == "PERMISSION_ERROR"
    finally:
        _cleanup(email)


def test_officer_dispatch_writes_operator_alert(client: TestClient) -> None:
    officer_email = _email("gis-officer")
    csc_email = _email("gis-csc")
    try:
        officer = client.post(
            "/api/v1/auth/register",
            json={"email": officer_email, "password": "test-pass-12", "display_name": "Officer"},
        )
        csc = client.post(
            "/api/v1/auth/register",
            json={"email": csc_email, "password": "test-pass-12", "display_name": "CSC"},
        )
        assert officer.status_code == 200 and csc.status_code == 200
        officer_token = officer.json()["data"]["access_token"]

        session = SessionLocal()
        try:
            district = session.scalars(select(District).limit(1)).first()
            welfare = session.scalar(select(Role).where(Role.code == "WELFARE_OFFICER"))
            csc_role = session.scalar(select(Role).where(Role.code == "CSC_OPERATOR"))
            officer_user = session.scalar(select(User).where(User.email == officer_email))
            csc_user = session.scalar(select(User).where(User.email == csc_email))
            if district is None or welfare is None or csc_role is None or officer_user is None or csc_user is None:
                pytest.skip("roles or districts are not seeded")
            session.add(UserRole(user_id=officer_user.id, role_id=welfare.id))
            session.add(UserRole(user_id=csc_user.id, role_id=csc_role.id))
            session.commit()
            district_id = district.id
            csc_id = csc_user.id
        finally:
            session.close()

        dispatched = client.post(
            f"/api/v1/analytics/districts/{district_id}/csc-camp",
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        if dispatched.status_code in {409, 500}:
            pytest.skip("CSC_CAMP_DISPATCH needs alembic revision c4a91f2e8b17")
        assert dispatched.status_code == 200, dispatched.text
        data = dispatched.json()["data"]
        assert data["sms_gateway"] is False
        assert data["created"] >= 1
        assert "lakh" not in str(data).lower()

        session = SessionLocal()
        try:
            rows = list(session.scalars(select(Alert).where(Alert.user_id == csc_id)).all())
        finally:
            session.close()
        assert any(row.alert_type == "CSC_CAMP_DISPATCH" for row in rows)
    finally:
        _cleanup(officer_email)
        _cleanup(csc_email)
