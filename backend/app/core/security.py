"""Password hashing, JWT, and DPDP identifier masking.

Never log return values that contain tokens or raw passwords.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta
from typing import Any, Literal
from uuid import UUID, uuid4

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from app.config import settings
from app.core.exceptions import AuthError

_HASHER = PasswordHasher()
_LONG_DIGITS = re.compile(r"\d{8,}")
TokenType = Literal["access", "refresh"]


def hash_password(plain: str) -> str:
    return _HASHER.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _HASHER.verify(hashed, plain)
    except (VerifyMismatchError, InvalidHashError, TypeError, ValueError):
        return False


def needs_rehash(hashed: str) -> bool:
    try:
        return _HASHER.check_needs_rehash(hashed)
    except (InvalidHashError, TypeError, ValueError):
        return True


def mask_email(email: str | None) -> str | None:
    """Mask an email so responses never echo the full identifier."""
    if not email or "@" not in email:
        return None
    local, _, domain = email.partition("@")
    if not local or not domain:
        return None
    return f"{local[0]}***@{domain}"


def scrub_identifier_digits(value: str | None) -> str | None:
    """Refuse to persist long digit runs (Aadhaar / account shaped values)."""
    if value is None:
        return None
    return _LONG_DIGITS.sub("XXXXXXXX", value)


def _require_signing_key() -> str:
    if settings.is_production and settings.jwt_secret_is_placeholder:
        raise RuntimeError("JWT_SECRET_KEY must be set to a real secret in production")
    return settings.jwt_secret_key


def create_token(
    subject: UUID | str,
    *,
    token_type: TokenType,
    roles: list[str] | None = None,
    sid: str | None = None,
) -> str:
    now = datetime.now(UTC)
    if token_type == "access":
        lifetime = timedelta(minutes=settings.access_token_expire_minutes)
    else:
        lifetime = timedelta(days=settings.refresh_token_expire_days)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "typ": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + lifetime).timestamp()),
        "jti": str(uuid4()),
    }
    if sid:
        payload["sid"] = sid
    if token_type == "access":
        payload["roles"] = roles or []
    return jwt.encode(payload, _require_signing_key(), algorithm=settings.jwt_algorithm)


def decode_token(token: str, *, expected_type: TokenType) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, _require_signing_key(), algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("Token has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError("Invalid token") from exc
    if payload.get("typ") != expected_type:
        raise AuthError("Invalid token")
    if not payload.get("sub"):
        raise AuthError("Invalid token")
    return payload


def access_expires_seconds() -> int:
    return int(settings.access_token_expire_minutes * 60)
