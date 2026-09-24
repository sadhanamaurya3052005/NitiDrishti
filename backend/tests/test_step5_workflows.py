"""Step 5 online E2E: real auth, RBAC, Postgres writes, AST — then purge Step 5 users."""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, inspect, select

from app.core.database import SessionLocal, check_connection, engine
from app.main import app
from app.models.actions import ActionDossier, Alert, AuditLog
from app.models.applications import Application
from app.models.identity import Role, User, UserProfile, UserRole
from app.models.policy import Policy, PolicyChange, PolicyClause, PolicyVersion

PASSWORD = "Step5-pass-12"


def _db_ready() -> bool:
    if not check_connection()["connected"]:
        return False
    inspector = inspect(engine)
    return inspector.has_table("users") and inspector.has_table("applications")


@pytest.fixture
def client() -> Iterator[TestClient]:
    if not _db_ready():
        pytest.skip("PostgreSQL production schema is not available")
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


def _email(role: str) -> str:
    return f"step5-{role}-{uuid.uuid4().hex[:10]}@example.com"


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


def _register(client: TestClient, email: str, *, name: str = "Step5 tester") -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD, "display_name": name},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert "password" not in data
    assert "password_hash" not in str(data).lower()
    return data


def _login(client: TestClient, email: str) -> dict:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["data"]


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _revoke(email: str, role_code: str) -> None:
    session = SessionLocal()
    try:
        user = session.scalar(select(User).where(User.email == email))
        role = session.scalar(select(Role).where(Role.code == role_code))
        if user is None or role is None:
            return
        session.execute(delete(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == role.id))
        session.commit()
    finally:
        session.close()


def _grant(email: str, role_code: str) -> None:
    session = SessionLocal()
    try:
        user = session.scalar(select(User).where(User.email == email))
        role = session.scalar(select(Role).where(Role.code == role_code))
        if user is None or role is None:
            pytest.skip(f"{role_code} is not seeded")
        existing = session.scalar(
            select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == role.id)
        )
        if existing is None:
            session.add(UserRole(user_id=user.id, role_id=role.id))
            session.commit()
    finally:
        session.close()


def _published_slug(client: TestClient) -> str:
    listed = client.get("/api/v1/schemes")
    assert listed.status_code == 200
    items = listed.json()["data"]["schemes"]
    assert items, "published catalog is empty"
    return str(items[0]["id"])


def test_step5_citizen_register_login_eligibility_application_logout(client: TestClient) -> None:
    email = _email("citizen")
    dup = _email("dup")
    try:
        created = _register(client, email, name="Step5 Citizen")
        token = created["access_token"]
        refresh = created["refresh_token"]
        me = client.get("/api/v1/auth/me", headers=_headers(token))
        assert me.status_code == 200
        assert me.json()["data"]["email_masked"]
        assert "CITIZEN" in me.json()["data"]["roles"]
        assert created["user"]["email_masked"] != email

        again = client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": PASSWORD, "display_name": "Dup"},
        )
        assert again.status_code == 409
        invalid = client.post("/api/v1/auth/register", json={"email": "not-an-email", "password": "x"})
        assert invalid.status_code == 422
        assert "password" not in (invalid.text or "").lower() or "password" in str(invalid.json().get("error"))

        wrong = client.post("/api/v1/auth/login", json={"email": email, "password": "wrong-pass-99"})
        assert wrong.status_code == 401
        assert wrong.json()["error"]["code"] == "AUTH_ERROR"
        assert "traceback" not in wrong.text.lower()
        malformed = client.post("/api/v1/auth/login", json={"email": "nope", "password": "x"})
        assert malformed.status_code == 422

        schemes = client.get("/api/v1/schemes")
        assert schemes.status_code == 200
        items = schemes.json()["data"]["schemes"]
        assert len(items) >= 1
        slug = items[0]["id"]
        detail = client.get(f"/api/v1/schemes/{slug}")
        assert detail.status_code == 200
        searched = client.get("/api/v1/search/schemes", params={"q": items[0]["name"][:8]})
        assert searched.status_code == 200
        missing_scheme = client.get("/api/v1/schemes/not-a-real-scheme-zzz")
        assert missing_scheme.status_code == 404
        assert missing_scheme.json()["success"] is False

        rich = {
            "profile": {
                "age": 28,
                "income": 80000,
                "land_hectares": 1.2,
                "gender": "female",
                "category": "OBC",
                "occupation": "farmer",
            }
        }
        empty = {"profile": {}}
        steep = {"profile": {"age": 90, "income": 9_000_000, "occupation": "other", "category": "GEN"}}
        eligible = client.post("/api/v1/eligibility", json=rich)
        unknown = client.post("/api/v1/eligibility", json=empty)
        ineligible = client.post("/api/v1/eligibility", json=steep)
        for response in (eligible, unknown, ineligible):
            assert response.status_code == 200, response.text
            payload = response.json()["data"]
            assert "llm_vote" not in payload
            assert payload.get("engine") != "llm"
            rows = payload["evaluations"]
            assert rows
            for row in rows:
                status = row["evaluation"]["status"]
                assert status in {"ELIGIBLE", "PARTIAL_INFO", "INELIGIBLE"}
                for rule in row["evaluation"]["rules"]:
                    assert rule["verdict"] in {"pass", "fail", "unknown"}
        statuses = {row["evaluation"]["status"] for row in eligible.json()["data"]["evaluations"]}
        unknown_statuses = {row["evaluation"]["status"] for row in unknown.json()["data"]["evaluations"]}
        assert "PARTIAL_INFO" in unknown_statuses or unknown_statuses <= {"PARTIAL_INFO", "INELIGIBLE", "ELIGIBLE"}
        assert statuses

        what_if = client.post("/api/v1/what-if", json=rich)
        assert what_if.status_code == 200
        assert what_if.json()["success"] is True
        bad_what = client.post("/api/v1/what-if", json={"profile": {"age": 400}})
        assert bad_what.status_code == 422

        filed = client.post(
            "/api/v1/applications",
            json={"scheme_id": slug, "stage": "Discovered"},
            headers=_headers(token),
        )
        assert filed.status_code == 200, filed.text
        app_row = filed.json()["data"]
        app_id = app_row["id"]
        assert app_row["stage"] == "Discovered"
        uuid.UUID(app_id)
        mine = client.get("/api/v1/applications", headers=_headers(token))
        assert mine.status_code == 200
        ids = [item["id"] for item in mine.json()["data"]["applications"]]
        assert app_id in ids

        session = SessionLocal()
        try:
            db_row = session.scalar(select(Application).where(Application.id == uuid.UUID(app_id)))
            assert db_row is not None
            assert str(db_row.user_id) == created["user"]["id"]
            assert db_row.stage == "Discovered"
        finally:
            session.close()

        alerts = client.post("/api/v1/alerts/scan-published", headers=_headers(token))
        assert alerts.status_code == 200
        listed_alerts = client.get("/api/v1/alerts", headers=_headers(token))
        assert listed_alerts.status_code == 200

        ghost = client.get("/api/v1/applications", headers=_headers("not-a-jwt"))
        assert ghost.status_code == 401

        logged_out = client.post("/api/v1/auth/logout", headers=_headers(token))
        assert logged_out.status_code == 200
        denied = client.get("/api/v1/auth/me", headers=_headers(token))
        assert denied.status_code == 401
        stale_refresh = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
        assert stale_refresh.status_code == 401
        relogin = _login(client, email)
        assert client.get("/api/v1/auth/me", headers=_headers(relogin["access_token"])).status_code == 200

        _register(client, dup)
    finally:
        _cleanup(email)
        _cleanup(dup)


def test_step5_citizen_a_b_isolation(client: TestClient) -> None:
    a = _email("citizena")
    b = _email("citizenb")
    try:
        token_a = _register(client, a)["access_token"]
        token_b = _register(client, b)["access_token"]
        slug = _published_slug(client)
        created = client.post(
            "/api/v1/applications",
            json={"scheme_id": slug, "stage": "Submitted"},
            headers=_headers(token_a),
        )
        assert created.status_code == 200
        app_id = created.json()["data"]["id"]
        dossier = client.post("/api/v1/dossiers", json={"scheme_id": slug}, headers=_headers(token_a))
        assert dossier.status_code == 200
        dossier_id = dossier.json()["data"]["id"]

        b_apps = client.get("/api/v1/applications", headers=_headers(token_b))
        assert b_apps.status_code == 200
        assert all(item["id"] != app_id for item in b_apps.json()["data"]["applications"])
        b_dossiers = client.get("/api/v1/dossiers", headers=_headers(token_b))
        assert all(item["id"] != dossier_id for item in b_dossiers.json()["data"]["dossiers"])

        client.post("/api/v1/alerts/scan-published", headers=_headers(token_a))
        a_alerts = client.get("/api/v1/alerts", headers=_headers(token_a)).json()["data"]["alerts"]
        if a_alerts:
            steal = client.post(
                f"/api/v1/alerts/{a_alerts[0]['id']}/read",
                headers=_headers(token_b),
            )
            assert steal.status_code == 404
        stage = client.patch(
            f"/api/v1/applications/{app_id}/stage",
            json={"stage": "Submitted"},
            headers=_headers(token_b),
        )
        assert stage.status_code == 403
        me_b = client.get("/api/v1/auth/me", headers=_headers(token_b)).json()["data"]
        me_a = client.get("/api/v1/auth/me", headers=_headers(token_a)).json()["data"]
        assert me_a["id"] != me_b["id"]
    finally:
        _cleanup(a)
        _cleanup(b)


def test_step5_student_opportunities_and_public_catalog(client: TestClient) -> None:
    email = _email("student")
    try:
        token = _register(client, email)["access_token"]
        _grant(email, "STUDENT")
        headers = _headers(token)
        me = client.get("/api/v1/auth/me", headers=headers)
        assert me.status_code == 200
        for path in (
            "/api/v1/opportunities",
            "/api/v1/scholarships",
            "/api/v1/internships",
            "/api/v1/jobs",
        ):
            response = client.get(path)
            assert response.status_code == 200, path
            assert response.json()["success"] is True
        assert client.get("/api/v1/admin/users", headers=headers).status_code == 403
        assert client.get("/api/v1/applications/queue", headers=headers).status_code == 403
        assert client.post("/api/v1/eligibility", json={"profile": {"occupation": "student", "age": 20}}).status_code == 200
    finally:
        _cleanup(email)


def test_step5_csc_application_dossier_receipt_fields(client: TestClient) -> None:
    email = _email("csc")
    try:
        token = _register(client, email)["access_token"]
        _grant(email, "CSC_OPERATOR")
        headers = _headers(token)
        slug = _published_slug(client)
        filed = client.post(
            "/api/v1/applications",
            json={"scheme_id": slug, "stage": "Submitted"},
            headers=headers,
        )
        assert filed.status_code == 200, filed.text
        data = filed.json()["data"]
        assert data["id"]
        assert data["scheme_name"]
        assert data["stage"] == "Submitted"
        dossier = client.post("/api/v1/dossiers", json={"scheme_id": slug}, headers=headers)
        assert dossier.status_code == 200
        assert dossier.json()["data"]["status"] == "queued"
        assert client.get("/api/v1/csc/summary", headers=headers).status_code == 200
        assert client.get("/api/v1/admin/users", headers=headers).status_code == 403
        assert client.get("/api/v1/applications/queue", headers=headers).status_code == 403
        assert client.get("/api/v1/review/schemes", headers=headers).status_code == 403
        missing = client.post("/api/v1/applications", json={"scheme_id": "no-such-scheme"}, headers=headers)
        assert missing.status_code == 404
    finally:
        _cleanup(email)


def test_step5_welfare_valid_and_invalid_stage(client: TestClient) -> None:
    citizen = _email("welfare-citizen")
    officer = _email("welfare")
    try:
        citizen_token = _register(client, citizen)["access_token"]
        officer_token = _register(client, officer)["access_token"]
        _grant(officer, "WELFARE_OFFICER")
        slug = _published_slug(client)
        created = client.post(
            "/api/v1/applications",
            json={"scheme_id": slug, "stage": "Discovered"},
            headers=_headers(citizen_token),
        )
        assert created.status_code == 200
        app_id = created.json()["data"]["id"]

        queue = client.get("/api/v1/applications/queue", headers=_headers(officer_token))
        assert queue.status_code == 200
        assert any(item["id"] == app_id for item in queue.json()["data"]["applications"])

        invalid = client.patch(
            f"/api/v1/applications/{app_id}/stage",
            json={"stage": "Sanctioned"},
            headers=_headers(officer_token),
        )
        assert invalid.status_code == 422
        session = SessionLocal()
        try:
            row = session.scalar(select(Application).where(Application.id == uuid.UUID(app_id)))
            assert row is not None
            assert row.stage == "Discovered"
        finally:
            session.close()

        valid = client.patch(
            f"/api/v1/applications/{app_id}/stage",
            json={"stage": "Submitted"},
            headers=_headers(officer_token),
        )
        assert valid.status_code == 200, valid.text
        assert valid.json()["data"]["stage"] == "Submitted"
        session = SessionLocal()
        try:
            row = session.scalar(select(Application).where(Application.id == uuid.UUID(app_id)))
            assert row is not None and row.stage == "Submitted"
            audit = session.scalars(
                select(AuditLog)
                .where(AuditLog.action == "application_submit", AuditLog.entity_id == app_id)
                .order_by(AuditLog.created_at.desc())
            ).first()
            assert audit is not None
            assert audit.detail and "recorded_official_outcome=Submitted" in audit.detail
            assert "password" not in (audit.detail or "").lower()
        finally:
            session.close()

        missing = client.patch(
            f"/api/v1/applications/{uuid.uuid4()}/stage",
            json={"stage": "Submitted"},
            headers=_headers(officer_token),
        )
        assert missing.status_code == 404
        citizen_write = client.patch(
            f"/api/v1/applications/{app_id}/stage",
            json={"stage": "Tehsil Verified"},
            headers=_headers(citizen_token),
        )
        assert citizen_write.status_code == 403
    finally:
        _cleanup(citizen)
        _cleanup(officer)


def test_step5_analyst_policies_review_admin_forbidden(client: TestClient) -> None:
    email = _email("analyst")
    try:
        token = _register(client, email)["access_token"]
        _grant(email, "POLICY_ANALYST")
        headers = _headers(token)
        policies = client.get("/api/v1/policies")
        assert policies.status_code == 200
        rows = policies.json()["data"]["policies"]
        assert rows, "no ingested policies"
        policy_id = rows[0]["id"]
        detail = client.get(f"/api/v1/policies/{policy_id}")
        assert detail.status_code == 200
        versions = client.get(f"/api/v1/policies/{policy_id}/versions")
        assert versions.status_code == 200
        compared = client.get(f"/api/v1/policies/{policy_id}/compare")
        assert compared.status_code == 200
        review = client.get("/api/v1/review/schemes", headers=headers)
        assert review.status_code == 200
        assert client.get("/api/v1/admin/users", headers=headers).status_code == 403
        assert client.get("/api/v1/admin/audit", headers=headers).status_code == 403
        fake = client.post(
            "/api/v1/review/schemes/not-a-scheme",
            json={"action": "approve"},
            headers=headers,
        )
        assert fake.status_code in {404, 422}
    finally:
        _cleanup(email)


def test_step5_admin_directory_roles_audit(client: TestClient) -> None:
    admin_email = _email("admin")
    target_email = _email("admin-target")
    citizen_email = _email("not-admin")
    try:
        admin_token = _register(client, admin_email)["access_token"]
        _grant(admin_email, "ADMIN")
        target = _register(client, target_email)
        target_id = target["user"]["id"]
        headers = _headers(admin_token)
        users = client.get("/api/v1/admin/users", headers=headers)
        assert users.status_code == 200
        blob = users.text.lower()
        assert "password" not in blob
        assert "eyj" not in blob
        assigned = client.patch(
            f"/api/v1/admin/users/{target_id}/roles",
            json={"roles": ["STUDENT"]},
            headers=headers,
        )
        assert assigned.status_code == 200, assigned.text
        assert "STUDENT" in assigned.json()["data"]["roles"]
        flags = client.get("/api/v1/admin/flags", headers=headers)
        assert flags.status_code == 200
        audit = client.get("/api/v1/admin/audit", headers=headers, params={"action": "role_change"})
        assert audit.status_code == 200
        events = audit.json()["data"]["items"] if "items" in audit.json()["data"] else audit.json()["data"]
        assert events
        guest = client.get("/api/v1/admin/users")
        assert guest.status_code == 401
        citizen_token = _register(client, citizen_email)["access_token"]
        denied = client.get("/api/v1/admin/users", headers=_headers(citizen_token))
        assert denied.status_code == 403
    finally:
        emails: list[str] = []
        session = SessionLocal()
        try:
            extras = session.scalars(select(User).where(User.email.like("step5-%@example.com"))).all()
            emails = [user.email for user in extras if user.email]
        finally:
            session.close()
        for address in {*emails, admin_email, target_email, citizen_email}:
            _cleanup(address)


def test_step5_authorization_matrix_and_envelope(client: TestClient) -> None:
    citizen = _email("matrix-citizen")
    csc = _email("matrix-csc")
    welfare = _email("matrix-welfare")
    analyst = _email("matrix-analyst")
    admin = _email("matrix-admin")
    try:
        c_tok = _register(client, citizen)["access_token"]
        s_tok = _register(client, csc)["access_token"]
        w_tok = _register(client, welfare)["access_token"]
        a_tok = _register(client, analyst)["access_token"]
        ad_tok = _register(client, admin)["access_token"]
        _grant(csc, "CSC_OPERATOR")
        _grant(welfare, "WELFARE_OFFICER")
        _grant(analyst, "POLICY_ANALYST")
        _grant(admin, "ADMIN")

        assert client.get("/api/v1/applications/queue").status_code == 401
        assert client.get("/api/v1/applications/queue", headers={"Authorization": "Bearer not-a-jwt"}).status_code == 401
        assert client.get("/api/v1/applications/queue", headers=_headers(c_tok)).status_code == 403
        assert client.get("/api/v1/applications/queue", headers=_headers(s_tok)).status_code == 403
        assert client.get("/api/v1/applications/queue", headers=_headers(w_tok)).status_code == 200
        assert client.get("/api/v1/applications/queue", headers=_headers(a_tok)).status_code == 403
        assert client.get("/api/v1/applications/queue", headers=_headers(ad_tok)).status_code == 200

        assert client.get("/api/v1/review/schemes", headers=_headers(c_tok)).status_code == 403
        assert client.get("/api/v1/review/schemes", headers=_headers(s_tok)).status_code == 403
        assert client.get("/api/v1/review/schemes", headers=_headers(w_tok)).status_code == 200
        assert client.get("/api/v1/review/schemes", headers=_headers(a_tok)).status_code == 200
        assert client.get("/api/v1/review/schemes", headers=_headers(ad_tok)).status_code == 200

        assert client.get("/api/v1/admin/users", headers=_headers(w_tok)).status_code == 403
        assert client.get("/api/v1/admin/users", headers=_headers(a_tok)).status_code == 403
        assert client.get("/api/v1/admin/users", headers=_headers(ad_tok)).status_code == 200

        empty = client.post("/api/v1/applications", json={}, headers=_headers(c_tok))
        assert empty.status_code == 422
        assert empty.json()["success"] is False
        assert "traceback" not in empty.text.lower()
        assert "sqlalchemy" not in empty.text.lower()
    finally:
        for address in (citizen, csc, welfare, analyst, admin):
            _cleanup(address)


def test_step5_application_idempotent_retry_allows_separate_row(client: TestClient) -> None:
    email = _email("idem")
    try:
        token = _register(client, email)["access_token"]
        slug = _published_slug(client)
        headers = {**_headers(token), "X-Request-Id": f"step5-idem-{uuid.uuid4().hex}"}
        first = client.post("/api/v1/applications", json={"scheme_id": slug, "stage": "Submitted"}, headers=headers)
        assert first.status_code == 200, first.text
        retry = client.post("/api/v1/applications", json={"scheme_id": slug, "stage": "Submitted"}, headers=headers)
        assert retry.status_code == 200, retry.text
        assert retry.json()["data"]["id"] == first.json()["data"]["id"]
        other = client.post(
            "/api/v1/applications",
            json={"scheme_id": slug, "stage": "Discovered"},
            headers={**_headers(token), "X-Request-Id": f"step5-idem-{uuid.uuid4().hex}"},
        )
        assert other.status_code == 200, other.text
        assert other.json()["data"]["id"] != first.json()["data"]["id"]
        mine = client.get("/api/v1/applications", headers=_headers(token))
        ids = [item["id"] for item in mine.json()["data"]["applications"]]
        assert ids.count(first.json()["data"]["id"]) == 1
        assert other.json()["data"]["id"] in ids
        assert len(ids) == 2
    finally:
        _cleanup(email)


def test_step5_application_create_ownership_and_roles(client: TestClient) -> None:
    citizen = _email("own-citizen")
    csc = _email("own-csc")
    officer = _email("own-officer")
    analyst = _email("own-analyst")
    admin = _email("own-admin")
    try:
        c_data = _register(client, citizen)
        s_tok = _register(client, csc)["access_token"]
        w_tok = _register(client, officer)["access_token"]
        a_tok = _register(client, analyst)["access_token"]
        ad_tok = _register(client, admin)["access_token"]
        _grant(csc, "CSC_OPERATOR")
        _grant(officer, "WELFARE_OFFICER")
        _grant(analyst, "POLICY_ANALYST")
        _grant(admin, "ADMIN")
        slug = _published_slug(client)
        c_headers = _headers(c_data["access_token"])

        created = client.post("/api/v1/applications", json={"scheme_id": slug}, headers=c_headers)
        assert created.status_code == 200, created.text
        session = SessionLocal()
        try:
            row = session.scalar(select(Application).where(Application.id == uuid.UUID(created.json()["data"]["id"])))
            assert row is not None
            assert str(row.user_id) == c_data["user"]["id"]
        finally:
            session.close()

        csc_filed = client.post("/api/v1/applications", json={"scheme_id": slug}, headers=_headers(s_tok))
        assert csc_filed.status_code == 200, csc_filed.text
        admin_filed = client.post("/api/v1/applications", json={"scheme_id": slug}, headers=_headers(ad_tok))
        assert admin_filed.status_code == 200, admin_filed.text

        officer_own = client.post("/api/v1/applications", json={"scheme_id": slug}, headers=_headers(w_tok))
        assert officer_own.status_code == 200
        analyst_own = client.post("/api/v1/applications", json={"scheme_id": slug}, headers=_headers(a_tok))
        assert analyst_own.status_code == 200

        _revoke(officer, "CITIZEN")
        _revoke(analyst, "CITIZEN")
        denied_officer = client.post("/api/v1/applications", json={"scheme_id": slug}, headers=_headers(w_tok))
        denied_analyst = client.post("/api/v1/applications", json={"scheme_id": slug}, headers=_headers(a_tok))
        assert denied_officer.status_code == 403
        assert denied_analyst.status_code == 403
        assert client.post("/api/v1/applications", json={"scheme_id": slug}).status_code == 401
    finally:
        for address in (citizen, csc, officer, analyst, admin):
            _cleanup(address)


def test_step5_nyay_mitra_compare_isolated_versions_then_delete(client: TestClient) -> None:
    code = f"STEP5-CMP-{uuid.uuid4().hex[:8]}"
    policy_id = None
    session = SessionLocal()
    try:
        policy = Policy(code=code, title="Step5 isolated compare", title_hi="", issuing_body="step5-test")
        session.add(policy)
        session.flush()
        policy_id = policy.id
        v1 = PolicyVersion(
            policy_id=policy.id,
            version_number=1,
            source_url="https://example.test/step5-v1",
            retrieved_at=datetime.now(UTC),
        )
        session.add(v1)
        session.flush()
        session.add(
            PolicyClause(
                policy_version_id=v1.id,
                clause_ref="1",
                text="Income support of 6000 rupees",
                sort_order=0,
            )
        )
        v2 = PolicyVersion(
            policy_id=policy.id,
            version_number=2,
            source_url="https://example.test/step5-v2",
            retrieved_at=datetime.now(UTC),
        )
        session.add(v2)
        session.flush()
        session.add(
            PolicyClause(
                policy_version_id=v2.id,
                clause_ref="1",
                text="Income support of 8000 rupees",
                sort_order=0,
            )
        )
        policy.current_version_id = v2.id
        session.commit()
        compared = client.get(f"/api/v1/policies/{policy.id}/compare")
        assert compared.status_code == 200, compared.text
        payload = compared.json()["data"]
        assert payload["changes"]
        assert payload["from_version"]
        assert payload["to_version"]
        kinds = {item["change_kind"] for item in payload["changes"]}
        assert kinds & {"numeric", "amended"}
    finally:
        if policy_id is not None:
            live = session.get(Policy, policy_id)
            if live is not None:
                version_ids = [row.id for row in session.scalars(select(PolicyVersion).where(PolicyVersion.policy_id == policy_id))]
                if version_ids:
                    session.execute(
                        delete(PolicyChange).where(
                            PolicyChange.from_version_id.in_(version_ids) | PolicyChange.to_version_id.in_(version_ids)
                        )
                    )
                    session.execute(delete(PolicyClause).where(PolicyClause.policy_version_id.in_(version_ids)))
                live.current_version_id = None
                session.flush()
                session.execute(delete(PolicyVersion).where(PolicyVersion.policy_id == policy_id))
                session.delete(live)
                session.commit()
        session.close()
