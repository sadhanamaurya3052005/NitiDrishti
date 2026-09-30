"""Layer-wise contracts using existing Pydantic patterns. Invalid artefacts do not pass silently."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from app.core.exceptions import ValidationError
from app.services.eligibility.ast_schema import validate_ast
from app.services.ingestion.payload import NormalizedScheme, RawPayload


class BronzeContract(BaseModel):
    source_url: str
    final_url: str
    retrieved_at: datetime
    content_hash: str = Field(min_length=64, max_length=64)
    mime_type: str
    byte_size: int = Field(ge=0)
    storage_path: str | None = None

    @field_validator("content_hash")
    @classmethod
    def _hex_hash(cls, value: str) -> str:
        if len(value) != 64 or any(ch not in "0123456789abcdef" for ch in value.lower()):
            raise ValueError("content_hash must be sha-256 hex")
        return value.lower()


class SilverContract(BaseModel):
    slug: str
    name: str
    summary: str
    source_url: str
    category: str
    quality_flags: list[str] = Field(default_factory=list)
    extraction_confidence: float = Field(ge=0.0, le=1.0)
    normalized_rule_count: int = Field(ge=0)


class GoldContract(BaseModel):
    slug: str
    version_number: int = Field(ge=1)
    status: Literal["draft", "published", "archived", "needs_review"]
    source_url: str
    source_document_id: str | None
    content_hash: str | None = None
    dq_score: int | None = Field(default=None, ge=0, le=100)
    freshness_status: str | None = None
    change_class: str | None = None
    rule_validation_status: Literal["VALID", "INVALID", "UNKNOWN"] = "UNKNOWN"
    extraction_confidence: float | None = Field(default=None, ge=0.0, le=1.0)


class AstContract(BaseModel):
    ast_json: dict[str, Any]

    @field_validator("ast_json")
    @classmethod
    def _valid_ast(cls, value: dict[str, Any]) -> dict[str, Any]:
        errors = validate_ast(value)
        if errors:
            raise ValueError(errors[0])
        return value


def assert_bronze(payload: RawPayload, *, storage_path: str | None = None) -> BronzeContract:
    try:
        return BronzeContract(
            source_url=payload.url,
            final_url=payload.final_url,
            retrieved_at=payload.retrieved_at,
            content_hash=payload.content_hash,
            mime_type=payload.mime_type or "application/octet-stream",
            byte_size=len(payload.content),
            storage_path=storage_path,
        )
    except Exception as exc:
        raise ValidationError(f"Bronze contract failed: {exc}") from exc


def assert_silver(scheme: NormalizedScheme) -> SilverContract:
    try:
        return SilverContract(
            slug=scheme.slug,
            name=scheme.name,
            summary=scheme.summary,
            source_url=scheme.source_url,
            category=scheme.category,
            quality_flags=list(scheme.quality_flags),
            extraction_confidence=float(scheme.confidence or 0.0),
            normalized_rule_count=len(scheme.rules),
        )
    except Exception as exc:
        raise ValidationError(f"Silver contract failed: {exc}") from exc


def assert_ast(ast_json: dict[str, Any]) -> AstContract:
    try:
        return AstContract(ast_json=ast_json)
    except Exception as exc:
        raise ValidationError(f"AST contract failed: {exc}") from exc


def assert_gold(payload: dict[str, Any]) -> GoldContract:
    try:
        return GoldContract(**payload)
    except Exception as exc:
        raise ValidationError(f"Gold contract failed: {exc}") from exc
