"""Auth request/response contracts. Identifiers are masked in responses."""

from __future__ import annotations

import re
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.security import scrub_identifier_digits

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _normalise_email(value: str) -> str:
    email = value.strip().lower()
    if not _EMAIL_RE.fullmatch(email):
        raise ValueError("Invalid email")
    return email


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)
    display_name: str | None = Field(default=None, max_length=120)

    @field_validator("email")
    @classmethod
    def normalise_email(cls, value: str) -> str:
        return _normalise_email(value)

    @field_validator("display_name")
    @classmethod
    def scrub_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = scrub_identifier_digits(value.strip()) or None
        return cleaned or None


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalise_email(cls, value: str) -> str:
        return _normalise_email(value)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=20)


class ProfileUpdateRequest(BaseModel):
    age: int | None = Field(default=None, ge=0, le=120)
    income: int | None = Field(default=None, ge=0)
    land_hectares: float | None = Field(default=None, ge=0)
    gender: Literal["any", "female", "male"] | None = None
    category: Literal["GEN", "OBC", "SC", "ST", "EWS"] | None = None
    occupation: Literal["farmer", "student", "artisan", "shg", "other"] | None = None
    state_id: UUID | None = None
    district_id: UUID | None = None
    consent_retention: bool | None = None
    notes: str | None = Field(default=None, max_length=2000)
    display_name: str | None = Field(default=None, max_length=120)

    @field_validator("notes", "display_name")
    @classmethod
    def scrub_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return scrub_identifier_digits(value.strip()) or None


class ProfilePublic(BaseModel):
    age: int | None = None
    income: int | None = None
    land_hectares: float | None = None
    gender: str | None = None
    category: str | None = None
    occupation: str | None = None
    state_id: UUID | None = None
    district_id: UUID | None = None
    consent_retention: bool = False


class UserPublic(BaseModel):
    id: UUID
    email_masked: str | None
    display_name: str | None
    roles: list[str]
    is_active: bool
    profile: ProfilePublic | None = None


class TokenBundle(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserPublic
