"""Health and version endpoints."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter

from app.config import settings
from app.core.database import check_connection
from app.schemas.system import DatabaseStatus, HealthResponse, VersionResponse

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse, summary="Service health probe")
def health() -> HealthResponse:
    db = check_connection()
    return HealthResponse(
        status="ok" if db["connected"] else "degraded",
        app=settings.app_name,
        environment=settings.app_env,
        version=settings.app_version,
        timestamp=datetime.now(UTC),
        database=DatabaseStatus(**db),
    )


@router.get("/api/version", response_model=VersionResponse, summary="Build metadata")
def version() -> VersionResponse:
    return VersionResponse(
        app=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
        status="production-ready core",
    )
