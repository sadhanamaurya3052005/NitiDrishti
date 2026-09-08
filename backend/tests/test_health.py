"""Phase 0 smoke tests: the app boots and reports its own state honestly."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_payload() -> None:
    response = client.get("/health")
    assert response.status_code == 200

    body = response.json()
    assert body["app"] == "NitiDrishti"
    assert body["status"] in {"ok", "degraded"}
    assert "database" in body
    assert isinstance(body["database"]["connected"], bool)


def test_health_status_matches_database_state() -> None:
    body = client.get("/health").json()
    expected = "ok" if body["database"]["connected"] else "degraded"
    assert body["status"] == expected


def test_version_endpoint() -> None:
    response = client.get("/api/version")
    assert response.status_code == 200
    assert response.json()["app"] == "NitiDrishti"


def test_openapi_schema_available() -> None:
    assert client.get("/openapi.json").status_code == 200
