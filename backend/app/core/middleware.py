"""ASGI middleware. Request IDs are attached to logs and error envelopes."""

from __future__ import annotations

from uuid import uuid4

import structlog
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.rate_limit import allow, limit_for_path, limiter_enabled
from app.schemas.envelope import fail

_SECURITY_HEADERS = (
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"referrer-policy", b"no-referrer"),
    (b"permissions-policy", b"camera=(), microphone=(), geolocation=()"),
)


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


class SecurityHeadersMiddleware:
    """Browser-facing defaults. Does not replace a full CSP for the Next.js origin."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: dict) -> None:
            if message["type"] == "http.response.start":
                raw_headers = list(message.get("headers", []))
                existing = {name.lower() for name, _value in raw_headers}
                for name, value in _SECURITY_HEADERS:
                    if name not in existing:
                        raw_headers.append((name, value))
                message = {**message, "headers": raw_headers}
            await send(message)

        await self.app(scope, receive, send_with_headers)


class RateLimitMiddleware:
    """Caps login, eligibility, and search. Guest eligibility still does not write rows."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or not limiter_enabled():
            await self.app(scope, receive, send)
            return

        path = scope.get("path") or ""
        ceiling = limit_for_path(path)
        if ceiling is None:
            await self.app(scope, receive, send)
            return

        client = (scope.get("client") or ("unknown", 0))[0]
        key = f"{client}:{path}"
        if allow(key, max_per_minute=ceiling):
            await self.app(scope, receive, send)
            return

        request_id = (scope.get("state") or {}).get("request_id") or "unknown"
        response = JSONResponse(
            status_code=429,
            content=fail("RATE_LIMITED", "Too many requests. Retry shortly.", str(request_id)),
        )
        await response(scope, receive, send)
