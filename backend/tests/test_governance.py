"""AST schema, conflicts, what-if hints, readiness — no UI."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.database import SessionLocal, check_connection
from app.main import app
from app.services.auth.service import table_counts
from app.services.eligibility.ast_schema import validate_ast
from app.services.eligibility.conflicts import detect_rule_conflicts
from app.services.eligibility.engine import RuleSpec
from app.services.eligibility.what_if import unlock_hints


def test_validate_ast_accepts_nested_and() -> None:
    errors = validate_ast(
        {
            "op": "and",
            "children": [
                {"op": "gte", "field": "age", "value": 18},
                {"op": "lte", "field": "income", "value": 250000},
            ],
        }
    )
    assert errors == []


def test_validate_ast_rejects_unknown_op() -> None:
    assert validate_ast({"op": "xor", "field": "age", "value": 1})


def test_income_conflicts_flag_two_caps() -> None:
    rules = [
        RuleSpec("a", "income", "Cap A", ast_json={"op": "lte", "field": "income", "value": 250000}, income_limit=250000),
        RuleSpec("b", "income", "Cap B", ast_json={"op": "lte", "field": "income", "value": 200000}, income_limit=200000),
    ]
    found = detect_rule_conflicts(rules)
    assert found and found[0]["kind"] == "income_cap"


def test_unlock_hints_on_failed_income() -> None:
    hints = unlock_hints(
        {
            "rules": [
                {
                    "id": "income",
                    "verdict": "fail",
                    "explanation": "Income ₹2,80,000 exceeds ₹2,50,000.",
                }
            ]
        }
    )
    assert hints and hints[0]["kind"] == "income"


def test_ready_reports_status() -> None:
    body = TestClient(app).get("/ready").json()
    assert body["status"] in {"ready", "not_ready"}
    assert "database" in body
    assert "storage" in body
    assert "flags" in body
    assert body["flags"]["disaster_module"] is False


def test_guest_what_if_endpoint() -> None:
    response = TestClient(app).post(
        "/api/v1/what-if",
        json={
            "profile": {
                "age": 28,
                "income": 180000,
                "land_hectares": 1.2,
                "gender": "female",
                "category": "OBC",
                "occupation": "farmer",
            }
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert "evaluations" in data
    assert data.get("disclaimer")


def test_guest_eligibility_does_not_write_profiles() -> None:
    if not check_connection()["connected"]:
        pytest.skip("PostgreSQL is not available")
    session = SessionLocal()
    try:
        before = table_counts(session)
    finally:
        session.close()

    payload = {
        "profile": {
            "age": 28,
            "income": 180000,
            "land_hectares": 1.2,
            "gender": "female",
            "category": "OBC",
            "occupation": "farmer",
        }
    }
    client = TestClient(app)
    assert client.post("/api/v1/eligibility", json=payload).status_code == 200
    assert client.post("/api/v1/what-if", json=payload).status_code == 200

    session = SessionLocal()
    try:
        after = table_counts(session)
    finally:
        session.close()
    assert after["users"] == before["users"]
    assert after["user_profiles"] == before["user_profiles"]
    assert after["applications"] == before["applications"]
    assert after == before


def test_health_sets_security_headers() -> None:
    response = TestClient(app).get("/health")
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("x-frame-options") == "DENY"
