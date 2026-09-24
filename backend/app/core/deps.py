"""FastAPI auth dependencies. Unauthenticated callers never write rows."""

from __future__ import annotations

from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.security.utils import get_authorization_scheme_param
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import AppError, AuthError
from app.core.rbac import assert_roles, assert_workspace
from app.core.security import decode_token
from app.models.identity import User
from app.services.auth.service import AuthService

# auto_error=False so missing Authorization becomes None and AuthError stays 401
# (HTTPBearer default would 403). Security() is what OpenAPI uses for the lock.
_bearer = HTTPBearer(
    auto_error=False,
    bearerFormat="JWT",
    scheme_name="HTTPBearer",
    description="JWT access token from POST /api/v1/auth/login",
)

AuthSession = Annotated[Session, Depends(get_db)]


def request_id_of(request: Request) -> str:
    return getattr(request.state, "request_id", None) or request.headers.get("x-request-id") or "unknown"


def get_auth_service(session: AuthSession) -> AuthService:
    return AuthService(session)


CurrentAuthService = Annotated[AuthService, Depends(get_auth_service)]
BearerCreds = Annotated[HTTPAuthorizationCredentials | None, Security(_bearer)]


def get_current_user(
    credentials: BearerCreds,
    service: CurrentAuthService,
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer" or not credentials.credentials:
        raise AuthError("Not authenticated")
    payload = decode_token(credentials.credentials, expected_type="access")
    service.assert_token_active(payload)
    return service.require_user(UUID(str(payload["sub"])))


def get_optional_user(
    request: Request,
    service: CurrentAuthService,
) -> User | None:
    """Public routes may use a stored profile when a valid access token is present.

    The Authorization header is read without HTTPBearer so OpenAPI does not mark
    guest-capable routes as requiring authentication.
    """
    scheme, credentials = get_authorization_scheme_param(request.headers.get("Authorization"))
    if scheme.lower() != "bearer" or not credentials:
        return None
    try:
        payload = decode_token(credentials, expected_type="access")
        service.assert_token_active(payload)
        return service.require_user(UUID(str(payload["sub"])))
    except (AppError, ValueError):
        return None


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]


def require_roles(*codes: str) -> Callable[..., User]:
    def dependency(user: CurrentUser) -> User:
        assert_roles((role.code for role in user.roles), *codes)
        return user

    return dependency


def require_workspace(workspace: str) -> Callable[..., User]:
    """Gate a route by the frozen role-by-workspace matrix in app.core.rbac.

    Public catalog GETs (schemes, analytics/summary, csc/summary, welfare/summary)
    must not use this. Write/desk-operator routes should.
    """

    def dependency(user: CurrentUser) -> User:
        assert_workspace((role.code for role in user.roles), workspace)
        return user

    return dependency
