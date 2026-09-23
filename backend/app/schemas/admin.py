"""Admin directory contracts. No profile PII, no raw emails."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.enums import ROLE_CODES


class RoleAssignmentRequest(BaseModel):
    roles: list[str] = Field(min_length=1, max_length=len(ROLE_CODES))

    @field_validator("roles")
    @classmethod
    def known_roles(cls, value: list[str]) -> list[str]:
        cleaned: list[str] = []
        seen: set[str] = set()
        for code in value:
            item = code.strip().upper()
            if item not in ROLE_CODES:
                raise ValueError(f"Unknown role: {code}")
            if item in seen:
                continue
            seen.add(item)
            cleaned.append(item)
        if not cleaned:
            raise ValueError("At least one role is required")
        return cleaned


class UserStatusRequest(BaseModel):
    is_active: bool


class AdminUser(BaseModel):
    id: UUID
    email_masked: str | None
    display_name: str | None
    roles: list[str]
    is_active: bool
    created_at: datetime


class AuditEntry(BaseModel):
    id: UUID
    action: str
    actor_user_id: UUID | None
    entity_type: str | None
    entity_id: str | None
    request_id: str | None
    detail: str | None
    created_at: datetime


class AdminFlags(BaseModel):
    source: str = "environment"
    writable: bool = False
    environment: str
    flags: dict[str, bool]
