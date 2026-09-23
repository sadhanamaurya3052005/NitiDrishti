"""Human-in-the-loop publish gate for needs_review catalogue rows."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles, request_id_of
from app.schemas.citizen import ReviewActionRequest
from app.schemas.envelope import ok
from app.services.schemes import SchemeCatalogService

router = APIRouter(prefix="/api/v1/review", tags=["review"])

DbSession = Annotated[Session, Depends(get_db)]
Reviewer = Annotated[object, Depends(require_roles("POLICY_ANALYST", "WELFARE_OFFICER", "ADMIN"))]


@router.get("/schemes", summary="Schemes waiting for analyst publish")
def review_queue(request: Request, db: DbSession, user: Reviewer) -> dict:
    return ok(SchemeCatalogService(db).list_review_queue(), request_id_of(request))


@router.post("/schemes/{scheme_id}", summary="Approve or reject a needs_review scheme")
def review_scheme(
    scheme_id: str,
    payload: ReviewActionRequest,
    request: Request,
    db: DbSession,
    user: Reviewer,
) -> dict:
    data = SchemeCatalogService(db).review_scheme(
        scheme_id=scheme_id,
        action=payload.action,
        user=user,
        request_id=request_id_of(request),
    )
    return ok(data, request_id_of(request))
