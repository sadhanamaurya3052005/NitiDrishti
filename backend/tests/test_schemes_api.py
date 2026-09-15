"""Public catalog stays on the frozen envelope once Postgres is reachable."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.database import check_connection
from app.main import app

client = TestClient(app)


@pytest.mark.skipif(not check_connection()["connected"], reason="PostgreSQL not reachable")
def test_schemes_list_uses_envelope() -> None:
    response = client.get("/api/v1/schemes")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["error"] is None
    assert "request_id" in body
    assert "schemes" in body["data"]
    assert isinstance(body["data"]["schemes"], list)
    if body["data"]["schemes"]:
        item = body["data"]["schemes"][0]
        for key in ("id", "code", "name", "nameHi", "category", "sourceUrl"):
            assert key in item


@pytest.mark.skipif(not check_connection()["connected"], reason="PostgreSQL not reachable")
def test_sources_status_uses_envelope() -> None:
    response = client.get("/api/v1/sources/status")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "sources" in body["data"]


@pytest.mark.skipif(not check_connection()["connected"], reason="PostgreSQL not reachable")
def test_updates_uses_envelope() -> None:
    response = client.get("/api/v1/updates")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "updates" in body["data"]
