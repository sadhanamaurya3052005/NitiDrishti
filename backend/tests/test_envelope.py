"""Envelope and error-handler contracts."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.error_handlers import register_error_handlers
from app.core.exceptions import NotFoundError
from app.core.middleware import RequestIdMiddleware
from app.schemas.envelope import fail, ok


def test_ok_envelope_shape() -> None:
    body = ok({"ping": "pong"}, "req-1")
    assert body == {
        "success": True,
        "data": {"ping": "pong"},
        "error": None,
        "request_id": "req-1",
    }


def test_fail_envelope_shape() -> None:
    body = fail("NOT_FOUND", "missing", "req-2")
    assert body["success"] is False
    assert body["data"] is None
    assert body["error"] == {"code": "NOT_FOUND", "message": "missing"}
    assert body["request_id"] == "req-2"


def test_app_error_uses_envelope() -> None:
    app = FastAPI()
    app.add_middleware(RequestIdMiddleware)
    register_error_handlers(app)

    @app.get("/missing")
    def missing() -> None:
        raise NotFoundError("scheme not found")

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/missing", headers={"x-request-id": "fixed-id"})
    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["data"] is None
    assert body["error"]["code"] == "NOT_FOUND"
    assert body["error"]["message"] == "scheme not found"
    assert body["request_id"] == "fixed-id"
    assert response.headers.get("x-request-id") == "fixed-id"


def test_health_stays_flat() -> None:
    from app.main import app

    body = TestClient(app).get("/health").json()
    assert "success" not in body
    assert "app" in body
    assert "database" in body
