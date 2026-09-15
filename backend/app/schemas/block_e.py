"""Alert and opportunity request bodies."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.security import scrub_identifier_digits
from app.models.enums import ALERT_TYPES


class AlertCreateRequest(BaseModel):
    alert_type: str
    scheme_id: UUID | None = None
    payload: dict[str, Any] = Field(default_factory=dict)

    @field_validator("alert_type")
    @classmethod
    def closed_alert_type(cls, value: str) -> str:
        if value not in ALERT_TYPES:
            allowed = ", ".join(ALERT_TYPES)
            raise ValueError(f"alert_type must be one of {allowed}")
        return value

    @field_validator("payload")
    @classmethod
    def scrub_payload(cls, value: dict[str, Any]) -> dict[str, Any]:
        return _scrub_json(value)


class AssistantAskRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)

    @field_validator("query")
    @classmethod
    def strip_query(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("query must not be empty")
        return cleaned[:500]


def _scrub_json(value: Any) -> Any:
    if isinstance(value, str):
        return scrub_identifier_digits(value) or ""
    if isinstance(value, dict):
        return {str(key)[:64]: _scrub_json(item) for key, item in list(value.items())[:40]}
    if isinstance(value, list):
        return [_scrub_json(item) for item in value[:40]]
    if isinstance(value, (int, float, bool)) or value is None:
        return value
    return str(value)[:500]
