"""Idempotent operator accounts. Self-register remains CITIZEN-only."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.config import Settings, settings
from app.core.security import hash_password
from app.models.identity import User
from app.repositories.roles import RoleRepository
from app.repositories.users import UserRepository

MIN_PASSWORD_LENGTH = 8

OPERATOR_SPECS: tuple[tuple[str, str, str, str], ...] = (
    ("bootstrap_officer_email", "bootstrap_officer_password", "WELFARE_OFFICER", "Welfare officer"),
    ("bootstrap_admin_email", "bootstrap_admin_password", "ADMIN", "Administrator"),
    ("bootstrap_csc_email", "bootstrap_csc_password", "CSC_OPERATOR", "CSC operator"),
)


@dataclass(frozen=True)
class BootstrapResult:
    role: str
    email: str
    status: str
    detail: str = ""


def _valid_email(value: str) -> str | None:
    email = value.strip().lower()
    if not email or "@" not in email:
        return None
    if email.startswith("your-") or "changeme" in email or email.startswith("change_me"):
        return None
    local, _, domain = email.partition("@")
    if not local or "." not in domain:
        return None
    return email


def upsert_operator(
    session: Session,
    *,
    email: str,
    password: str,
    role_code: str,
    display_name: str,
) -> BootstrapResult:
    normalised = _valid_email(email)
    if normalised is None:
        return BootstrapResult(role_code, email, "skipped", "email missing or placeholder")
    if len(password) < MIN_PASSWORD_LENGTH:
        return BootstrapResult(role_code, normalised, "skipped", "password shorter than 8 characters")

    roles = RoleRepository(session)
    users = UserRepository(session)
    role = roles.get_by_code(role_code)
    if role is None:
        return BootstrapResult(role_code, normalised, "skipped", f"{role_code} role is not seeded")

    user = users.get_by_email(normalised)
    if user is None:
        user = User(
            email=normalised,
            password_hash=hash_password(password),
            display_name=display_name,
            is_active=True,
        )
        users.add(user)
        session.flush()
        status = "created"
    else:
        user.password_hash = hash_password(password)
        user.is_active = True
        user.deleted_at = None
        if not user.display_name:
            user.display_name = display_name
        status = "updated"
    users.assign_role(user, role)
    session.flush()
    return BootstrapResult(role_code, normalised, status)


def bootstrap_operators(session: Session, *, cfg: Settings | None = None) -> list[BootstrapResult]:
    active = cfg or settings
    results: list[BootstrapResult] = []
    for email_field, password_field, role_code, display_name in OPERATOR_SPECS:
        results.append(
            upsert_operator(
                session,
                email=getattr(active, email_field) or "",
                password=getattr(active, password_field) or "",
                role_code=role_code,
                display_name=display_name,
            )
        )
    return results
