"""Title and summary search over published schemes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import request_id_of
from app.schemas.envelope import ok
from app.services.search import SearchService

router = APIRouter(prefix="/api/v1/search", tags=["search"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("/schemes", summary="Search published schemes by title and summary")
def search_schemes(
    request: Request,
    db: DbSession,
    q: str | None = Query(default=None, max_length=200),
    category: str | None = Query(default=None),
) -> dict:
    payload = SearchService(db).search_schemes(q=q, category=category)
    return ok(payload, request_id_of(request))
