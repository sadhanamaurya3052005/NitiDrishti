"""Public scheme catalog from ingested Postgres rows, same JSON shape as before."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.envelope import ok
from app.services.schemes import SchemeCatalogService

router = APIRouter(prefix="/api/v1", tags=["schemes"])

DbSession = Annotated[Session, Depends(get_db)]


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", None) or request.headers.get("x-request-id") or "unknown"


@router.get("/schemes", summary="List official scheme catalog")
def list_schemes(
    request: Request,
    db: DbSession,
    category: str | None = Query(default=None),
    q: str | None = Query(default=None),
) -> dict:
    payload = SchemeCatalogService(db).list_payload(category=category, q=q)
    return ok(payload, _request_id(request))


@router.get("/schemes/{scheme_id}/documents", summary="Required document types")
def list_scheme_documents(scheme_id: str, request: Request, db: DbSession) -> dict:
    items = SchemeCatalogService(db).list_documents(scheme_id)
    return ok({"documents": items}, _request_id(request))


@router.get("/schemes/{scheme_id}", summary="Get one official scheme")
def get_scheme(scheme_id: str, request: Request, db: DbSession) -> dict:
    item = SchemeCatalogService(db).get_scheme(scheme_id)
    return ok({"scheme": item}, _request_id(request))


@router.get("/schemes/{scheme_id}/versions", summary="Immutable version history")
def list_scheme_versions(scheme_id: str, request: Request, db: DbSession) -> dict:
    items = SchemeCatalogService(db).list_versions(scheme_id)
    return ok({"versions": items}, _request_id(request))
