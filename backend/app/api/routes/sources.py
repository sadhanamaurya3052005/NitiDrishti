"""Public ingestion source status. Admin write endpoints require JWT."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.envelope import ok
from app.services.sources import SourceStatusService

router = APIRouter(prefix="/api/v1", tags=["sources"])

DbSession = Annotated[Session, Depends(get_db)]


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", None) or request.headers.get("x-request-id") or "unknown"


@router.get("/sources/status", summary="Official source crawl status")
def source_status(request: Request, db: DbSession) -> dict:
    items = SourceStatusService(db).list_status()
    return ok({"sources": items}, _request_id(request))
