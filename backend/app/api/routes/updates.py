"""Scheme update feed derived from immutable version rows."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.envelope import ok
from app.services.schemes import SchemeCatalogService

router = APIRouter(prefix="/api/v1", tags=["updates"])

DbSession = Annotated[Session, Depends(get_db)]


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", None) or request.headers.get("x-request-id") or "unknown"


@router.get("/updates", summary="Recent scheme version changes")
def list_updates(
    request: Request,
    db: DbSession,
    limit: int = Query(default=50, ge=1, le=200),
) -> dict:
    items = SchemeCatalogService(db).list_updates(limit=limit)
    return ok({"updates": items}, _request_id(request))
