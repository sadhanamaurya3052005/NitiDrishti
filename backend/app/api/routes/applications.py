"""Application submit. Authenticated insert only — guests write zero rows."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import CurrentUser, request_id_of, require_roles, require_workspace
from app.models.identity import User
from app.schemas.citizen import ApplicationCreateRequest, ApplicationStageRequest
from app.schemas.envelope import ok
from app.services.applications import ApplicationService

router = APIRouter(prefix="/api/v1", tags=["applications"])

DbSession = Annotated[Session, Depends(get_db)]
OfficerQueue = Annotated[User, Depends(require_roles("WELFARE_OFFICER", "ADMIN"))]
CitizenWriter = Annotated[User, Depends(require_workspace("citizen"))]


@router.post("/applications", summary="Submit an application row (no identity digits)")
def create_application(
    payload: ApplicationCreateRequest,
    request: Request,
    db: DbSession,
    user: CitizenWriter,
) -> dict:
    data = ApplicationService(db).create(
        user,
        scheme_id=payload.scheme_id,
        district_id=payload.district_id,
        stage=payload.stage,
        request_id=request_id_of(request),
    )
    return ok(data, request_id_of(request))


@router.get("/applications", summary="List my application rows")
def list_applications(request: Request, db: DbSession, user: CurrentUser) -> dict:
    return ok(ApplicationService(db).list_mine(user), request_id_of(request))


@router.get("/applications/queue", summary="Officer queue — record official outcomes, not ministry API")
def list_application_queue(
    request: Request,
    db: DbSession,
    user: OfficerQueue,
) -> dict:
    return ok(ApplicationService(db).list_queue(user), request_id_of(request))


@router.patch("/applications/{application_id}/stage", summary="Record the next official department stage")
def record_application_stage(
    application_id: UUID,
    payload: ApplicationStageRequest,
    request: Request,
    db: DbSession,
    user: OfficerQueue,
) -> dict:
    data = ApplicationService(db).record_official_stage(
        user,
        application_id=application_id,
        stage=payload.stage,
        request_id=request_id_of(request),
    )
    return ok(data, request_id_of(request))
