"""Step 6: replay the same X-Request-Id after a lost response; no duplicate row."""

from __future__ import annotations

import uuid
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import app
from tests.test_step5_workflows import (
    _cleanup,
    _db_ready,
    _email,
    _headers,
    _published_slug,
    _register,
)


@pytest.fixture
def client() -> Iterator[TestClient]:
    if not _db_ready():
        pytest.skip("PostgreSQL production schema is not available")
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


def test_step6_lost_response_replay_same_request_id(client: TestClient) -> None:
    email = _email("step6-replay")
    try:
        token = _register(client, email)["access_token"]
        slug = _published_slug(client)
        request_id = f"step6-{uuid.uuid4().hex}"
        headers = {**_headers(token), "X-Request-Id": request_id}
        first = client.post("/api/v1/applications", json={"scheme_id": slug, "stage": "Submitted"}, headers=headers)
        assert first.status_code == 200, first.text
        app_id = first.json()["data"]["id"]
        again = client.post("/api/v1/applications", json={"scheme_id": slug, "stage": "Submitted"}, headers=headers)
        assert again.status_code == 200
        assert again.json()["data"]["id"] == app_id
        third = client.post("/api/v1/applications", json={"scheme_id": slug, "stage": "Submitted"}, headers=headers)
        assert third.json()["data"]["id"] == app_id
        mine = client.get("/api/v1/applications", headers=_headers(token))
        ids = [item["id"] for item in mine.json()["data"]["applications"]]
        assert ids.count(app_id) == 1
        assert len(ids) == 1
        unauth = client.post("/api/v1/applications", json={"scheme_id": slug}, headers={"X-Request-Id": request_id})
        assert unauth.status_code == 401
        invalid = client.post(
            "/api/v1/applications",
            json={"scheme_id": "no-such-scheme"},
            headers={**_headers(token), "X-Request-Id": f"step6-bad-{uuid.uuid4().hex}"},
        )
        assert invalid.status_code == 404
        mine_after = client.get("/api/v1/applications", headers=_headers(token))
        assert len(mine_after.json()["data"]["applications"]) == 1
    finally:
        _cleanup(email)


def test_step6_missing_request_id_creates_separate_rows(client: TestClient) -> None:
    email = _email("step6-unknown")
    try:
        token = _register(client, email)["access_token"]
        slug = _published_slug(client)
        first = client.post("/api/v1/applications", json={"scheme_id": slug}, headers=_headers(token))
        second = client.post("/api/v1/applications", json={"scheme_id": slug}, headers=_headers(token))
        assert first.status_code == 200
        assert second.status_code == 200
        assert first.json()["data"]["id"] != second.json()["data"]["id"]
    finally:
        _cleanup(email)
