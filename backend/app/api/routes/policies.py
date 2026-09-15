"""Nyay-Mitra policy catalog and version compare."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.envelope import ok
from app.services.policies import PolicyCatalogService

router = APIRouter(prefix="/api/v1", tags=["policies"])

DbSession = Annotated[Session, Depends(get_db)]


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", None) or request.headers.get("x-request-id") or "unknown"


@router.get("/policies", summary="Ingested policies")
def list_policies(request: Request, db: DbSession, q: str | None = Query(default=None)) -> dict:
    return ok({"policies": PolicyCatalogService(db).list_policies(q=q)}, _request_id(request))


@router.get("/policies/{policy_id}", summary="One policy with current clauses")
def get_policy(policy_id: str, request: Request, db: DbSession) -> dict:
    return ok({"policy": PolicyCatalogService(db).get_policy(policy_id)}, _request_id(request))


@router.get("/policies/{policy_id}/versions", summary="Immutable policy versions")
def list_versions(policy_id: str, request: Request, db: DbSession) -> dict:
    return ok({"versions": PolicyCatalogService(db).list_versions(policy_id)}, _request_id(request))


@router.get("/policies/{policy_id}/versions/{version_id}/clauses", summary="Clauses for one version")
def list_clauses(policy_id: str, version_id: str, request: Request, db: DbSession) -> dict:
    return ok(
        {"clauses": PolicyCatalogService(db).list_clauses(policy_id, version_id)},
        _request_id(request),
    )


@router.get("/policies/{policy_id}/changes", summary="Stored or computed diff of the two newest versions")
def list_changes(policy_id: str, request: Request, db: DbSession) -> dict:
    return ok({"changes": PolicyCatalogService(db).list_changes(policy_id)}, _request_id(request))


@router.get("/policies/{policy_id}/compare", summary="Compare two ingested versions")
def compare_versions(
    policy_id: str,
    request: Request,
    db: DbSession,
    from_version: str | None = Query(default=None),
    to_version: str | None = Query(default=None),
) -> dict:
    return ok(
        PolicyCatalogService(db).compare(policy_id, from_version=from_version, to_version=to_version),
        _request_id(request),
    )
