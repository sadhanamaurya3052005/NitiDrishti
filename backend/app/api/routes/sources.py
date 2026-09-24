"""Public ingestion source status. Admin write endpoints require JWT."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.identity import User
from app.schemas.envelope import ok
from app.services.pipeline_map import PipelineMapService
from app.services.source_control import SourceControlService
from app.services.sources import SourceStatusService

router = APIRouter(prefix="/api/v1", tags=["sources"])

DbSession = Annotated[Session, Depends(get_db)]
DeadLetterDesk = Annotated[User, Depends(require_roles("WELFARE_OFFICER", "POLICY_ANALYST", "ADMIN"))]
SourceRerunDesk = Annotated[User, Depends(require_roles("WELFARE_OFFICER", "ADMIN"))]


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", None) or request.headers.get("x-request-id") or "unknown"


@router.get("/sources/status", summary="Official source crawl status")
def source_status(request: Request, db: DbSession) -> dict:
    items = SourceStatusService(db).snapshot()
    return ok(items, _request_id(request))


@router.get("/pipeline", summary="Bronze / silver / gold ingest map — not Airflow")
def pipeline_map(request: Request, db: DbSession) -> dict:
    return ok(PipelineMapService(db).snapshot(), _request_id(request))


@router.get("/sources/dead-letter", summary="Failed ingestion runs for officer inspection")
def dead_letter(
    request: Request,
    db: DbSession,
    user: DeadLetterDesk,
) -> dict:
    return ok(SourceControlService(db).dead_letter(), _request_id(request))


@router.post("/sources/{source_id}/run", summary="Re-run one official source")
def rerun_source(
    source_id: str,
    request: Request,
    db: DbSession,
    user: SourceRerunDesk,
) -> dict:
    data = SourceControlService(db).rerun(source_id, user=user, request_id=_request_id(request))
    return ok(data, _request_id(request))
