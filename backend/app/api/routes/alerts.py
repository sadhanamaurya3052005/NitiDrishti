"""Alerts for logged-in users. Guests receive AUTH_ERROR and no insert."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import CurrentUser, request_id_of
from app.schemas.block_e import AlertCreateRequest
from app.schemas.envelope import ok
from app.services.alerts import AlertService

router = APIRouter(prefix="/api/v1", tags=["alerts"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("/alerts", summary="List my alerts")
def list_alerts(request: Request, user: CurrentUser, db: DbSession) -> dict:
    return ok({"alerts": AlertService(db).list_mine(user)}, request_id_of(request))


@router.post("/alerts", summary="Create an alert for the current user")
def create_alert(
    payload: AlertCreateRequest,
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> dict:
    return ok({"alert": AlertService(db).create(user, payload)}, request_id_of(request))


@router.post("/alerts/scan-published", summary="Notify about published catalog schemes (not eligibility)")
def scan_published(request: Request, user: CurrentUser, db: DbSession) -> dict:
    return ok(AlertService(db).scan_published(user), request_id_of(request))


@router.post("/alerts/{alert_id}/read", summary="Mark one of my alerts as read")
def mark_read(alert_id: str, request: Request, user: CurrentUser, db: DbSession) -> dict:
    return ok({"alert": AlertService(db).mark_read(user, alert_id)}, request_id_of(request))
