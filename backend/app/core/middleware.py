"""ASGI middleware. Request IDs are attached to logs and error envelopes."""

from __future__ import annotations

from uuid import uuid4

import structlog
from starlette.types import ASGIApp, Receive, Scope, Send


class RequestIdMiddleware:
    """Stamp every request with X-Request-ID without reading the body."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = {k.decode().lower(): v.decode() for k, v in scope.get("headers", [])}
        request_id = headers.get("x-request-id") or str(uuid4())
        scope["state"] = {**scope.get("state", {}), "request_id": request_id}
        structlog.contextvars.bind_contextvars(request_id=request_id)

        async def send_with_id(message: dict) -> None:
            if message["type"] == "http.response.start":
                raw_headers = list(message.get("headers", []))
                raw_headers.append((b"x-request-id", request_id.encode()))
                message = {**message, "headers": raw_headers}
            await send(message)

        try:
            await self.app(scope, receive, send_with_id)
        finally:
            structlog.contextvars.unbind_contextvars("request_id")
