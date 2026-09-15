"""Published jobs, internships and scholarships from our own crawl."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.envelope import ok
from app.services.opportunities import OpportunityCatalogService

router = APIRouter(prefix="/api/v1", tags=["opportunities"])

DbSession = Annotated[Session, Depends(get_db)]


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", None) or request.headers.get("x-request-id") or "unknown"


@router.get("/opportunities", summary="Published gazette jobs, internships and scholarships")
def list_opportunities(
    request: Request,
    db: DbSession,
    kind: str | None = Query(default=None),
    q: str | None = Query(default=None),
) -> dict:
    return ok(OpportunityCatalogService(db).list_all(kind=kind, q=q), _request_id(request))


@router.get("/jobs", summary="Published government job notifications")
def list_jobs(request: Request, db: DbSession, q: str | None = Query(default=None)) -> dict:
    data = OpportunityCatalogService(db).list_all(kind="job", q=q)
    return ok({"jobs": data["jobs"]}, _request_id(request))


@router.get("/internships", summary="Published internship circulars")
def list_internships(request: Request, db: DbSession, q: str | None = Query(default=None)) -> dict:
    data = OpportunityCatalogService(db).list_all(kind="internship", q=q)
    return ok({"internships": data["internships"]}, _request_id(request))


@router.get("/scholarships", summary="Published scholarship notifications")
def list_scholarships(request: Request, db: DbSession, q: str | None = Query(default=None)) -> dict:
    data = OpportunityCatalogService(db).list_all(kind="scholarship", q=q)
    return ok({"scholarships": data["scholarships"]}, _request_id(request))


@router.get("/opportunities/{item_id}", summary="One published opportunity")
def get_opportunity(item_id: str, request: Request, db: DbSession) -> dict:
    return ok({"item": OpportunityCatalogService(db).get(item_id)}, _request_id(request))
