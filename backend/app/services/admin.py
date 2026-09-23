"""ADMIN directory: roles, status, flags, audit. Never returns profile PII."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import BusinessRuleError, NotFoundError, ValidationError
from app.core.security import mask_email, scrub_identifier_digits
from app.models.identity import User
from app.repositories.audit import AuditRepository
from app.repositories.roles import RoleRepository
from app.repositories.users import UserRepository
from app.schemas.admin import AdminFlags, AdminUser, AuditEntry


def _to_admin_user(user: User) -> AdminUser:
    return AdminUser(
        id=user.id,
        email_masked=mask_email(user.email),
        display_name=user.display_name,
        roles=[role.code for role in user.roles],
        is_active=user.is_active,
        created_at=user.created_at,
    )


class AdminService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.roles = RoleRepository(session)
        self.audit = AuditRepository(session)

    def list_users(self, *, limit: int = 40, email: str | None = None) -> dict:
        items = self.users.list_directory(limit=limit, email=email)
        return {"items": [_to_admin_user(user).model_dump(mode="json") for user in items]}

    def assign_roles(self, *, actor: User, user_id: UUID, roles: list[str], request_id: str) -> dict:
        target = self.users.get_directory(user_id)
        if target is None:
            raise NotFoundError("User not found")
        wanted = list(dict.fromkeys(roles))
        resolved = []
        for code in wanted:
            row = self.roles.get_by_code(code)
            if row is None:
                raise ValidationError(f"Role is not seeded: {code}")
            resolved.append(row)
        current = {role.code for role in target.roles}
        dropping_admin = "ADMIN" in current and "ADMIN" not in wanted
        if dropping_admin and self._active_admin_count() <= 1:
            raise BusinessRuleError("The last active ADMIN cannot be removed")
        self.users.replace_roles(target, resolved)
        self.audit.record(
            action="role_change",
            actor_user_id=actor.id,
            request_id=request_id,
            entity_type="users",
            entity_id=str(target.id),
            detail=f"roles={','.join(wanted)}",
        )
        self.session.commit()
        reloaded = self.users.get_directory(target.id)
        if reloaded is None:
            raise NotFoundError("User not found")
        return _to_admin_user(reloaded).model_dump(mode="json")

    def set_active(self, *, actor: User, user_id: UUID, is_active: bool, request_id: str) -> dict:
        target = self.users.get_directory(user_id)
        if target is None:
            raise NotFoundError("User not found")
        had_admin = any(role.code == "ADMIN" for role in target.roles)
        if target.is_active and not is_active and had_admin and self._active_admin_count() <= 1:
            raise BusinessRuleError("The last active ADMIN cannot be deactivated")
        target.is_active = is_active
        self.audit.record(
            action="role_change",
            actor_user_id=actor.id,
            request_id=request_id,
            entity_type="users",
            entity_id=str(target.id),
            detail=f"is_active={str(is_active).lower()}",
        )
        self.session.commit()
        reloaded = self.users.get_directory(target.id)
        if reloaded is None:
            raise NotFoundError("User not found")
        return _to_admin_user(reloaded).model_dump(mode="json")

    def list_audit(self, *, limit: int = 40, action: str | None = None) -> dict:
        rows = self.audit.list_recent(limit=limit, action=action)
        items = [
            AuditEntry(
                id=row.id,
                action=row.action,
                actor_user_id=row.actor_user_id,
                entity_type=row.entity_type,
                entity_id=row.entity_id,
                request_id=row.request_id,
                detail=scrub_identifier_digits(row.detail),
                created_at=row.created_at,
            ).model_dump(mode="json")
            for row in rows
        ]
        return {"items": items}

    def flags(self) -> dict:
        payload = AdminFlags(
            source="environment",
            writable=False,
            environment=settings.app_env,
            flags={
                "ai_extraction": bool(settings.feature_ai_extraction),
                "disaster_module": bool(settings.feature_disaster_module),
                "what_if_api": bool(settings.feature_what_if_api),
                "ingest_scheduler_enabled": bool(settings.ingest_scheduler_enabled),
                "rate_limit_active": bool(settings.rate_limit_active),
                "jwt_secret_is_placeholder": bool(settings.jwt_secret_is_placeholder),
            },
        )
        return payload.model_dump(mode="json")

    def _active_admin_count(self) -> int:
        return self.users.count_active_with_role("ADMIN")
