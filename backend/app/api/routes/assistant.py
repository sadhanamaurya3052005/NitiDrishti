"""Keyword assistant over ingested official text. Degrades without pgvector."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import request_id_of
from app.schemas.block_e import AssistantAskRequest
from app.schemas.envelope import ok
from app.services.assistant import AssistantService

router = APIRouter(prefix="/api/v1/assistant", tags=["assistant"])

DbSession = Annotated[Session, Depends(get_db)]


@router.post("/ask", summary="Keyword search/explain over ingested official text")
def ask(payload: AssistantAskRequest, request: Request, db: DbSession) -> dict:
    return ok(AssistantService(db).ask(payload.query), request_id_of(request))
