"""CSC / welfare / analytics reads from real catalog and ingest logs."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import CurrentUser, request_id_of
from app.schemas.envelope import ok
from app.services.analytics import AnalyticsService

router = APIRouter(prefix="/api/v1", tags=["analytics"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("/analytics/summary", summary="Honest catalog aggregates")
def analytics_summary(request: Request, db: DbSession) -> dict:
    return ok(AnalyticsService(db).summary(), request_id_of(request))


@router.get("/csc/summary", summary="CSC desk aggregates from Postgres")
def csc_summary(request: Request, db: DbSession) -> dict:
    return ok(AnalyticsService(db).csc_summary(), request_id_of(request))


@router.get("/welfare/summary", summary="Welfare desk aggregates from Postgres")
def welfare_summary(request: Request, db: DbSession) -> dict:
    return ok(AnalyticsService(db).welfare_summary(), request_id_of(request))


@router.get("/analytics/districts", summary="District KPIs joined to reference geography")
def analytics_districts(
    request: Request,
    db: DbSession,
    state_id: Annotated[str | None, Query()] = None,
    metric: Annotated[str, Query()] = "coverage_saturation",
) -> dict:
    return ok(AnalyticsService(db).districts(state_id=state_id, metric=metric), request_id_of(request))


@router.get("/analytics/districts/{district_id}", summary="One district administrative card")
def analytics_district_detail(district_id: str, request: Request, db: DbSession) -> dict:
    return ok(AnalyticsService(db).district_detail(district_id), request_id_of(request))


@router.post(
    "/analytics/districts/{district_id}/csc-camp",
    summary="Notify CSC operators of a targeted camp (in-app alert, no SMS)",
)
def dispatch_csc_camp(district_id: str, request: Request, user: CurrentUser, db: DbSession) -> dict:
    return ok(AnalyticsService(db).dispatch_csc_camp(user, district_id), request_id_of(request))
