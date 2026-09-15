"""Search stays on the envelope and never invents catalog rows."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.database import check_connection
from app.main import app

client = TestClient(app)


@pytest.mark.skipif(not check_connection()["connected"], reason="PostgreSQL not reachable")
def test_search_uses_envelope_and_scheme_card_shape() -> None:
    response = client.get("/api/v1/search/schemes", params={"q": "kisan"})
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["error"] is None
    assert "request_id" in body
    data = body["data"]
    assert "schemes" in data
    assert data["source"] in {"postgres", "static_fallback"}
    assert isinstance(data["published_count"], int)
    assert data["published_count"] >= 0
    for item in data["schemes"]:
        for key in ("id", "code", "name", "nameHi", "category", "sourceUrl", "summary"):
            assert key in item


@pytest.mark.skipif(not check_connection()["connected"], reason="PostgreSQL not reachable")
def test_search_unknown_token_does_not_fabricate_rows() -> None:
    listed = client.get("/api/v1/schemes").json()["data"]
    miss = client.get("/api/v1/search/schemes", params={"q": "zzzxnotascheme999"}).json()["data"]
    assert miss["source"] == listed["source"]
    if listed["source"] == "postgres":
        assert miss["schemes"] == []
        assert miss["published_count"] == listed["published_count"]


@pytest.mark.skipif(not check_connection()["connected"], reason="PostgreSQL not reachable")
def test_schemes_query_shares_search_path() -> None:
    via_list = client.get("/api/v1/schemes", params={"q": "farmer"})
    via_search = client.get("/api/v1/search/schemes", params={"q": "farmer"})
    assert via_list.status_code == 200
    assert via_search.status_code == 200
    assert via_list.json()["data"]["source"] == via_search.json()["data"]["source"]
