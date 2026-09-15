"""Response schemas for system endpoints."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class DatabaseStatus(BaseModel):
    connected: bool
    server: str | None = None
    postgis_enabled: bool = False
    error: str | None = None


class HealthResponse(BaseModel):
    status: str = Field(description="ok when every dependency is reachable")
    app: str
    environment: str
    version: str
    timestamp: datetime
    database: DatabaseStatus


class VersionResponse(BaseModel):
    app: str
    version: str
    environment: str
    status: str
