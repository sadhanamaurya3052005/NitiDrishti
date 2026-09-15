"""Authentication and DPDP account lifecycle. No guest writes."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import AuthError, BusinessRuleError, DBError
from app.core.security import (
    access_expires_seconds,
    create_token,
    decode_token,
    hash_password,
    mask_email,
    needs_rehash,
    verify_password,
)
from app.models.actions import ActionDossier, Alert, AuditLog
from app.models.identity import User, UserProfile, UserRole
from app.repositories.audit import AuditRepository
from app.repositories.profiles import ProfileRepository
from app.repositories.roles import RoleRepository
from app.repositories.users import UserRepository
from app.schemas.auth import (
    LoginRequest,
    ProfilePublic,
    ProfileUpdateRequest,
    RegisterRequest,
    TokenBundle,
    UserPublic,
)

DEFAULT_ROLE = "CITIZEN"


def _role_codes(user: User) -> list[str]:
    return [role.code for role in user.roles]


def _profile_public(profile: UserProfile | None) -> ProfilePublic | None:
    if profile is None:
        return None
    return ProfilePublic(
        age=profile.age,
        income=profile.income,
        land_hectares=profile.land_hectares,
        gender=profile.gender,
        category=profile.category,
        occupation=profile.occupation,
        state_id=profile.state_id,
        district_id=profile.district_id,
        consent_retention=profile.consent_retention,
    )


def to_public(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        email_masked=mask_email(user.email),
        display_name=user.display_name,
        roles=_role_codes(user),
        is_active=user.is_active,
        profile=_profile_public(user.profile),
    )


def issue_tokens(user: User) -> TokenBundle:
    roles = _role_codes(user)
    return TokenBundle(
        access_token=create_token(user.id, token_type="access", roles=roles),
        refresh_token=create_token(user.id, token_type="refresh"),
        expires_in=access_expires_seconds(),
        user=to_public(user),
    )


class AuthService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.roles = RoleRepository(session)
        self.profiles = ProfileRepository(session)
        self.audit = AuditRepository(session)

    def register(self, payload: RegisterRequest, *, request_id: str) -> TokenBundle:
        if self.users.get_by_email(str(payload.email)):
            raise BusinessRuleError("An account with this email already exists")
        role = self.roles.get_by_code(DEFAULT_ROLE)
        if role is None:
            raise DBError("CITIZEN role is not seeded")
        user = User(
            email=str(payload.email).lower(),
            password_hash=hash_password(payload.password),
            display_name=payload.display_name,
            is_active=True,
        )
        self.users.add(user)
        self.session.flush()
        self.users.assign_role(user, role)
        self.session.flush()
        reloaded = self.users.get_active(user.id)
        if reloaded is None:
            raise DBError("Account could not be loaded after register")
        self.audit.record(
            action="login",
            actor_user_id=reloaded.id,
            request_id=request_id,
            entity_type="users",
            entity_id=str(reloaded.id),
            detail="register",
        )
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise BusinessRuleError("An account with this email already exists") from exc
        return issue_tokens(reloaded)

    def login(self, payload: LoginRequest, *, request_id: str) -> TokenBundle:
        user = self.users.get_by_email(str(payload.email))
        if (
            user is None
            or not user.is_active
            or not user.password_hash
            or not verify_password(payload.password, user.password_hash)
        ):
            # Same message either way so existence is not leaked. No audit row.
            raise AuthError("Invalid email or password")
        if needs_rehash(user.password_hash):
            user.password_hash = hash_password(payload.password)
        self.audit.record(
            action="login",
            actor_user_id=user.id,
            request_id=request_id,
            entity_type="users",
            entity_id=str(user.id),
            detail="login",
        )
        self.session.commit()
        return issue_tokens(user)

    def logout(self, user: User, *, request_id: str) -> dict[str, bool]:
        self.audit.record(
            action="logout",
            actor_user_id=user.id,
            request_id=request_id,
            entity_type="users",
            entity_id=str(user.id),
            detail="logout",
        )
        self.session.commit()
        return {"logged_out": True}

    def refresh(self, refresh_token: str) -> TokenBundle:
        payload = decode_token(refresh_token, expected_type="refresh")
        user = self.require_user(UUID(str(payload["sub"])))
        return issue_tokens(user)

    def require_user(self, user_id: UUID) -> User:
        user = self.users.get_active(user_id)
        if user is None or not user.is_active:
            raise AuthError("Not authenticated")
        return user

    def update_profile(self, user: User, payload: ProfileUpdateRequest, *, request_id: str) -> UserPublic:
        data = payload.model_dump(exclude_unset=True)
        display_name = data.pop("display_name", None)
        if "display_name" in payload.model_fields_set:
            user.display_name = display_name
        profile = self.profiles.get_by_user(user.id)
        if profile is None:
            profile = UserProfile(user_id=user.id)
            self.profiles.add(profile)
            user.profile = profile
        changed: list[str] = []
        if "display_name" in payload.model_fields_set:
            changed.append("display_name")
        if data.get("consent_retention") is True:
            data["consent_at"] = datetime.now(UTC)
        for field, value in data.items():
            setattr(profile, field, value)
            changed.append(field)
        self.session.flush()
        self.audit.record(
            action="profile_update",
            actor_user_id=user.id,
            request_id=request_id,
            entity_type="user_profiles",
            entity_id=str(user.id),
            detail=f"fields={','.join(changed) if changed else 'none'}",
        )
        self.session.commit()
        return to_public(user)

    def purge_account(self, user: User, *, request_id: str) -> dict[str, bool]:
        user_id = user.id
        self.audit.record(
            action="profile_purge",
            actor_user_id=user_id,
            request_id=request_id,
            entity_type="users",
            entity_id=str(user_id),
            detail="account_delete",
        )
        self.session.flush()
        self.session.execute(delete(Alert).where(Alert.user_id == user_id))
        self.session.execute(delete(ActionDossier).where(ActionDossier.user_id == user_id))
        self.session.execute(delete(UserProfile).where(UserProfile.user_id == user_id))
        self.session.execute(delete(UserRole).where(UserRole.user_id == user_id))
        self.session.expunge(user)
        self.session.execute(delete(User).where(User.id == user_id))
        self.session.commit()
        return {"purged": True}


def table_counts(session: Session) -> dict[str, int]:
    """Guest-isolation probe: anonymous traffic must not change these."""

    def _count(model: type[Any]) -> int:
        return int(session.scalar(select(func.count()).select_from(model)) or 0)

    return {
        "users": _count(User),
        "user_profiles": _count(UserProfile),
        "alerts": _count(Alert),
        "action_dossiers": _count(ActionDossier),
        "audit_logs": _count(AuditLog),
    }
