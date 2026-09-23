"""Citizen search / eligibility / dossier request bodies."""

from __future__ import annotations

from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DeclaredProfile(BaseModel):
    """Self-declared eligibility inputs. No Aadhaar or bank digits."""

    model_config = ConfigDict(populate_by_name=True)

    age: int | None = Field(default=None, ge=0, le=120)
    income: int | None = Field(default=None, ge=0)
    land_hectares: float | None = Field(default=None, ge=0, alias="landHectares")
    gender: Literal["any", "female", "male"] | None = None
    category: Literal["GEN", "OBC", "SC", "ST", "EWS"] | None = None
    occupation: Literal["farmer", "student", "artisan", "shg", "other"] | None = None
    state_id: UUID | None = None


class EligibilityRequest(BaseModel):
    scheme_ids: list[str] | None = Field(default=None, max_length=100)
    profile: DeclaredProfile | None = None
    as_of: date | None = None

    @field_validator("scheme_ids")
    @classmethod
    def trim_ids(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        cleaned = [item.strip() for item in value if item and item.strip()]
        return cleaned or None


class CompareRequest(BaseModel):
    scheme_ids: list[str] = Field(min_length=2, max_length=8)
    profile: DeclaredProfile | None = None
    as_of: date | None = None

    @field_validator("scheme_ids")
    @classmethod
    def unique_ids(cls, value: list[str]) -> list[str]:
        cleaned = [item.strip() for item in value if item and item.strip()]
        if len(cleaned) < 2:
            raise ValueError("Compare requires at least two scheme ids")
        return cleaned


class WhatIfRequest(BaseModel):
    scheme_ids: list[str] | None = Field(default=None, max_length=100)
    profile: DeclaredProfile | None = None
    as_of: date | None = None

    @field_validator("scheme_ids")
    @classmethod
    def trim_what_if_ids(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        cleaned = [item.strip() for item in value if item and item.strip()]
        return cleaned or None


class ReviewActionRequest(BaseModel):
    action: Literal["approve", "reject"]


class DossierCreateRequest(BaseModel):
    scheme_id: str = Field(min_length=1, max_length=160)


class ApplicationCreateRequest(BaseModel):
    scheme_id: str = Field(min_length=1, max_length=160)
    district_id: str | None = Field(default=None, max_length=64)
    stage: Literal["Discovered", "Submitted"] | None = None


class ApplicationStageRequest(BaseModel):
    stage: Literal["Submitted", "Tehsil Verified", "Sanctioned", "DBT Disbursed"]


class DossierPublic(BaseModel):
    id: UUID
    scheme_id: str | None
    scheme_name: str
    status: str
    created_at: str
