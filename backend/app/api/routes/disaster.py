"""Disaster catalog DSS. Guests may read; writes stay officer/analyst/admin."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import request_id_of, require_roles
from app.models.identity import User
from app.schemas.disaster import DisasterFocusRequest
from app.schemas.envelope import ok
from app.services.disaster import DisasterService

router = APIRouter(prefix="/api/v1/disaster", tags=["disaster"])

DbSession = Annotated[Session, Depends(get_db)]
Operator = Annotated[User, Depends(require_roles("POLICY_ANALYST", "WELFARE_OFFICER", "ADMIN"))]


def _service(db: Session) -> DisasterService:
    return DisasterService(db)


@router.get("/summary", summary="Catalog disaster-sector DSS — not NDMA live, not PostGIS")
def disaster_summary(
    request: Request,
    db: DbSession,
    state_iso: str | None = Query(default=None, max_length=8),
    district_name: str | None = Query(default=None, max_length=120),
) -> dict:
    return ok(
        _service(db).summary(state_iso=state_iso, district_name=district_name),
        request_id_of(request),
    )


@router.post("/focus", summary="Officer catalog focus on a bundled district name")
def disaster_focus(
    payload: DisasterFocusRequest,
    request: Request,
    db: DbSession,
    user: Operator,
) -> dict:
    del user
    return ok(
        _service(db).focus(state_iso=payload.state_iso, district_name=payload.district_name),
        request_id_of(request),
    )
