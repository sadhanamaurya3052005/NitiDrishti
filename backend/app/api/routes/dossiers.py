"""Action dossiers. Authenticated insert only — guests write zero rows."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import CurrentUser, request_id_of
from app.schemas.citizen import DossierCreateRequest
from app.schemas.envelope import ok
from app.services.dossiers import DossierService

router = APIRouter(prefix="/api/v1", tags=["dossiers"])

DbSession = Annotated[Session, Depends(get_db)]


@router.post("/dossiers", summary="Queue an action dossier")
def create_dossier(
    payload: DossierCreateRequest,
    request: Request,
    db: DbSession,
    user: CurrentUser,
) -> dict:
    data = DossierService(db).create(user, payload.scheme_id)
    return ok(data, request_id_of(request))


@router.get("/dossiers", summary="List my action dossiers")
def list_dossiers(request: Request, db: DbSession, user: CurrentUser) -> dict:
    return ok(DossierService(db).list_mine(user), request_id_of(request))
