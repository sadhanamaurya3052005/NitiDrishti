"""Disaster DSS contracts. Catalog rows only — no invented flood or beneficiary KPIs."""

from __future__ import annotations

from pydantic import BaseModel, Field


class DisasterFocusRequest(BaseModel):
    state_iso: str = Field(min_length=2, max_length=8)
    district_name: str = Field(min_length=2, max_length=120)
