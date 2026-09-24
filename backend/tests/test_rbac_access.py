"""Workspace/RBAC: public catalog honesty vs protected desk writes."""

from __future__ import annotations

import uuid
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, inspect, select

from app.core.database import SessionLocal, check_connection, engine
from app.main import app
from app.models.actions import ActionDossier, Alert
from app.models.applications import Application
from app.models.geography import District
from app.models.identity import Role, User, UserProfile, UserRole


def _db_ready() -> bool:
    if not check_connection()["connected"]:
        return False
    inspector = inspect(engine)
    return inspector.has_table("users") and inspector.has_table("roles")


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
        session.execute(delete(Application).where(Application.user_id == user.id))
        session.execute(delete(UserProfile).where(UserProfile.user_id == user.id))
        session.execute(delete(UserRole).where(UserRole.user_id == user.id))
        session.delete(user)
        session.commit()
    finally:
        session.close()


def _register(client: TestClient, email: str) -> str:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "test-pass-12", "display_name": "RBAC tester"},
    )
    assert response.status_code == 200, response.text
    return str(response.json()["data"]["access_token"])


def _grant(email: str, role_code: str) -> None:
    session = SessionLocal()
    try:
        if session.scalar(select(Role).where(Role.code == role_code)) is None:
            names = {
                "POLICY_ANALYST": ("Policy analyst", "नीति विश्लेषक"),
                "ADMIN": ("Administrator", "प्रशासक"),
                "CSC_OPERATOR": ("CSC operator", "CSC संचालक"),
                "WELFARE_OFFICER": ("Welfare officer", "कल्याण अधिकारी"),
            }
            label = names.get(role_code)
            if label is None:
                pytest.skip(f"{role_code} is not seeded")
            session.add(Role(code=role_code, name=label[0], name_hi=label[1]))
            session.commit()
        user = session.scalar(select(User).where(User.email == email))
        role = session.scalar(select(Role).where(Role.code == role_code))
        if user is None or role is None:
            pytest.skip("user or role missing")
        existing = session.scalar(
            select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == role.id)
        )
        if existing is None:
            session.add(UserRole(user_id=user.id, role_id=role.id))
            session.commit()
    finally:
        session.close()


def test_guest_catalog_honesty_stays_public(client: TestClient) -> None:
    for path in (
        "/health",
        "/ready",
        "/api/version",
        "/api/v1/schemes",
        "/api/v1/analytics/summary",
        "/api/v1/csc/summary",
        "/api/v1/welfare/summary",
        "/api/v1/disaster/summary",
        "/api/v1/analytics/districts",
        "/api/v1/search/schemes",
        "/api/v1/sources/status",
        "/api/v1/pipeline",
    ):
        response = client.get(path)
        assert response.status_code == 200, path


def test_guest_protected_routes_are_401(client: TestClient) -> None:
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get("/api/v1/alerts").status_code == 401
    assert client.get("/api/v1/dossiers").status_code == 401
    assert client.get("/api/v1/applications").status_code == 401
    assert client.get("/api/v1/admin/users").status_code == 401
    assert client.get("/api/v1/applications/queue").status_code == 401
    assert client.get("/api/v1/review/schemes").status_code == 401


def test_citizen_is_forbidden_on_officer_routes(client: TestClient) -> None:
    email = _email("rbac-citizen")
    try:
        token = _register(client, email)
        headers = {"Authorization": f"Bearer {token}"}
        assert client.get("/api/v1/auth/me", headers=headers).status_code == 200
        assert client.get("/api/v1/csc/summary", headers=headers).status_code == 200
        assert client.get("/api/v1/welfare/summary", headers=headers).status_code == 200
        admin = client.get("/api/v1/admin/users", headers=headers)
        assert admin.status_code == 403
        assert admin.json()["error"]["code"] == "PERMISSION_ERROR"
        queue = client.get("/api/v1/applications/queue", headers=headers)
        assert queue.status_code == 403
        review = client.get("/api/v1/review/schemes", headers=headers)
        assert review.status_code == 403
        assert client.get("/api/v1/applications", headers=headers).status_code == 200
        assert client.get("/api/v1/alerts", headers=headers).status_code == 200
    finally:
        _cleanup(email)


def test_csc_operator_cannot_use_welfare_workspace_write(client: TestClient) -> None:
    email = _email("rbac-csc")
    try:
        token = _register(client, email)
        _grant(email, "CSC_OPERATOR")
        headers = {"Authorization": f"Bearer {token}"}
        session = SessionLocal()
        try:
            district = session.scalars(select(District).limit(1)).first()
        finally:
            session.close()
        if district is None:
            pytest.skip("districts reference table is empty")
        forbidden = client.post(
            f"/api/v1/analytics/districts/{district.id}/csc-camp",
            headers=headers,
        )
        assert forbidden.status_code == 403
        assert forbidden.json()["error"]["code"] == "PERMISSION_ERROR"
        assert client.get("/api/v1/csc/summary", headers=headers).status_code == 200
        assert client.get("/api/v1/applications", headers=headers).status_code == 200
        assert client.get("/api/v1/alerts", headers=headers).status_code == 200
        admin = client.get("/api/v1/admin/users", headers=headers)
        assert admin.status_code == 403
        assert admin.json()["error"]["code"] == "PERMISSION_ERROR"
    finally:
        _cleanup(email)


def test_welfare_officer_can_reach_welfare_write(client: TestClient) -> None:
    email = _email("rbac-officer")
    try:
        token = _register(client, email)
        _grant(email, "WELFARE_OFFICER")
        headers = {"Authorization": f"Bearer {token}"}
        queue = client.get("/api/v1/applications/queue", headers=headers)
        assert queue.status_code == 200
        session = SessionLocal()
        try:
            district = session.scalars(select(District).limit(1)).first()
        finally:
            session.close()
        if district is None:
            pytest.skip("districts reference table is empty")
        camp = client.post(
            f"/api/v1/analytics/districts/{district.id}/csc-camp",
            headers=headers,
        )
        assert camp.status_code == 200
        assert camp.json()["success"] is True
        admin = client.get("/api/v1/admin/users", headers=headers)
        assert admin.status_code == 403
        assert admin.json()["error"]["code"] == "PERMISSION_ERROR"
    finally:
        _cleanup(email)


def test_policy_analyst_review_allowed_admin_forbidden(client: TestClient) -> None:
    email = _email("rbac-analyst")
    try:
        token = _register(client, email)
        _grant(email, "POLICY_ANALYST")
        headers = {"Authorization": f"Bearer {token}"}
        review = client.get("/api/v1/review/schemes", headers=headers)
        assert review.status_code == 200, review.text
        dead = client.get("/api/v1/sources/dead-letter", headers=headers)
        assert dead.status_code == 200, dead.text
        admin = client.get("/api/v1/admin/users", headers=headers)
        assert admin.status_code == 403
        assert admin.json()["error"]["code"] == "PERMISSION_ERROR"
        queue = client.get("/api/v1/applications/queue", headers=headers)
        assert queue.status_code == 403
        session = SessionLocal()
        try:
            district = session.scalars(select(District).limit(1)).first()
        finally:
            session.close()
        if district is not None:
            camp = client.post(
                f"/api/v1/analytics/districts/{district.id}/csc-camp",
                headers=headers,
            )
            assert camp.status_code == 403
            assert camp.json()["error"]["code"] == "PERMISSION_ERROR"
        rerun = client.post(f"/api/v1/sources/{uuid.uuid4()}/run", headers=headers)
        assert rerun.status_code == 403
        assert rerun.json()["error"]["code"] == "PERMISSION_ERROR"
    finally:
        _cleanup(email)


def test_admin_can_read_admin_directory(client: TestClient) -> None:
    email = _email("rbac-admin")
    try:
        token = _register(client, email)
        _grant(email, "ADMIN")
        headers = {"Authorization": f"Bearer {token}"}
        listed = client.get("/api/v1/admin/users", headers=headers)
        assert listed.status_code == 200, listed.text
        assert listed.json()["success"] is True
        assert client.get("/api/v1/applications/queue", headers=headers).status_code == 200
        assert client.get("/api/v1/review/schemes", headers=headers).status_code == 200
    finally:
        _cleanup(email)


def test_malformed_and_invalid_tokens_are_401(client: TestClient) -> None:
    missing = client.get("/api/v1/auth/me")
    assert missing.status_code == 401
    assert missing.json()["error"]["code"] == "AUTH_ERROR"
    malformed = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert malformed.status_code == 401
    assert malformed.json()["error"]["code"] == "AUTH_ERROR"
    invalid = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.nope"},
    )
    assert invalid.status_code == 401
    assert invalid.json()["error"]["code"] == "AUTH_ERROR"


def test_guest_eligibility_search_and_compare_stay_public(client: TestClient) -> None:
    profile = {
        "profile": {
            "age": 28,
            "income": 180000,
            "land_hectares": 1.2,
            "gender": "female",
            "category": "OBC",
            "occupation": "farmer",
        }
    }
    assert client.post("/api/v1/eligibility", json=profile).status_code == 200
    assert client.post("/api/v1/what-if", json=profile).status_code == 200
    assert client.get("/api/v1/search/schemes", params={"q": "kisan"}).status_code == 200
    compared = client.post("/api/v1/compare", json={"scheme_ids": ["a", "b"]})
    assert compared.status_code in {200, 404, 422}
    assert compared.status_code != 401


def test_openapi_bearer_only_on_protected_routes(client: TestClient) -> None:
    spec = client.get("/openapi.json").json()
    paths = spec["paths"]

    def _secured(path: str, method: str) -> bool:
        op = paths[path][method]
        requirements = op.get("security")
        if not requirements:
            return False
        return any("HTTPBearer" in item for item in requirements if isinstance(item, dict))

    for path in (
        "/health",
        "/ready",
        "/api/version",
        "/api/v1/schemes",
        "/api/v1/csc/summary",
        "/api/v1/welfare/summary",
        "/api/v1/search/schemes",
        "/api/v1/eligibility",
        "/api/v1/what-if",
        "/api/v1/auth/login",
    ):
        method = "post" if path in {"/api/v1/eligibility", "/api/v1/what-if", "/api/v1/auth/login"} else "get"
        assert path in paths, path
        assert _secured(path, method) is False, path

    for path, method in (
        ("/api/v1/auth/me", "get"),
        ("/api/v1/admin/users", "get"),
        ("/api/v1/applications/queue", "get"),
        ("/api/v1/ocr/preview", "post"),
        ("/api/v1/sources/{source_id}/run", "post"),
        ("/api/v1/analytics/districts/{district_id}/csc-camp", "post"),
    ):
        assert path in paths, path
        assert _secured(path, method) is True, path
