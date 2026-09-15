"""Idempotent operator bootstrap. Register remains CITIZEN-only."""

from __future__ import annotations

import uuid
from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import delete, inspect, select
from sqlalchemy.orm import selectinload

from app.api.error_handlers import register_error_handlers
from app.api.routes import auth, health
from app.core.database import SessionLocal, check_connection, engine
from app.core.middleware import RequestIdMiddleware
from app.models.actions import ActionDossier, Alert
from app.models.identity import Role, User, UserProfile, UserRole
from app.services.auth.bootstrap import bootstrap_operators, upsert_operator
from app.services.auth.service import table_counts


def _auth_app() -> FastAPI:
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
    return inspector.has_table("users") and inspector.has_table("roles")


@pytest.fixture
def client() -> Iterator[TestClient]:
    if not _db_ready():
        pytest.skip("PostgreSQL production schema is not available")
    with TestClient(_auth_app(), raise_server_exceptions=False) as test_client:
        yield test_client


def _email(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}@nitidrishti.local"


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


def test_register_stays_citizen_even_if_role_is_sent(client: TestClient) -> None:
    email = _email("reg-citizen")
    try:
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "test-pass-12",
                "display_name": "Citizen",
                "role": "ADMIN",
            },
        )
        assert response.status_code == 200, response.text
        assert response.json()["data"]["user"]["roles"] == ["CITIZEN"]
    finally:
        _cleanup(email)


def test_operator_upsert_is_idempotent_and_assigns_role() -> None:
    if not _db_ready():
        pytest.skip("PostgreSQL production schema is not available")
    email = _email("boot-officer")
    session = SessionLocal()
    try:
        if session.scalar(select(Role).where(Role.code == "WELFARE_OFFICER")) is None:
            pytest.skip("roles are not seeded")
        first = upsert_operator(
            session,
            email=email,
            password="officer-pass-12",
            role_code="WELFARE_OFFICER",
            display_name="Welfare officer",
        )
        session.commit()
        second = upsert_operator(
            session,
            email=email,
            password="officer-pass-12",
            role_code="WELFARE_OFFICER",
            display_name="Welfare officer",
        )
        session.commit()
        session.expire_all()
        user = session.scalar(
            select(User).options(selectinload(User.roles)).where(User.email == email)
        )
        assert first.status == "created"
        assert second.status == "updated"
        assert user is not None
        assert {role.code for role in user.roles} == {"WELFARE_OFFICER"}
        login = TestClient(_auth_app(), raise_server_exceptions=False).post(
            "/api/v1/auth/login",
            json={"email": email, "password": "officer-pass-12"},
        )
        assert login.status_code == 200, login.text
        assert "WELFARE_OFFICER" in login.json()["data"]["user"]["roles"]
    finally:
        session.close()
        _cleanup(email)


def test_bootstrap_skips_empty_env_and_writes_no_kpis() -> None:
    if not _db_ready():
        pytest.skip("PostgreSQL production schema is not available")
    session = SessionLocal()
    try:
        before_users = table_counts(session)["users"]
        cfg = type(
            "Cfg",
            (),
            {
                "bootstrap_officer_email": "",
                "bootstrap_officer_password": "",
                "bootstrap_admin_email": "your-admin@example.com",
                "bootstrap_admin_password": "change_me_admin_12",
                "bootstrap_csc_email": "",
                "bootstrap_csc_password": "",
            },
        )()
        results = bootstrap_operators(session, cfg=cfg)
        session.commit()
        after = table_counts(session)
        assert {row.status for row in results} == {"skipped"}
        assert after["users"] == before_users
    finally:
        session.close()
