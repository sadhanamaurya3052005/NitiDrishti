"""Manual source re-run and dead-letter inspection. JWT officers only."""

from __future__ import annotations

from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.models.ingestion import Source
from app.repositories.audit import AuditRepository
from app.repositories.ingestion import IngestionLogRepository, SourceRepository
from app.services.ingestion.opportunity_pipeline import OpportunityIngestionService
from app.services.ingestion.opportunity_registry import OPPORTUNITY_SOURCES
from app.services.ingestion.payload import SourceSpec
from app.services.ingestion.pipeline import SchemeIngestionService
from app.services.ingestion.policy_pipeline import PolicyIngestionService
from app.services.ingestion.policy_registry import POLICY_SOURCES

log = get_logger("nitidrishti.sources.run")


class SourceControlService:
    def __init__(self, session) -> None:
        self.session = session
        self.sources = SourceRepository(session)
        self.logs = IngestionLogRepository(session)

    def dead_letter(self, *, limit: int = 50) -> dict:
        rows = self.logs.list_failed(limit=limit)
        items = []
        for row in rows:
            source = self.sources.get(row.source_id)
            items.append(
                {
                    "log_id": str(row.id),
                    "source_id": str(row.source_id),
                    "source_url": None if source is None else source.source_url,
                    "name": None if source is None else source.name,
                    "status": row.status,
                    "error_code": row.error_code,
                    "detail": row.detail,
                    "http_status": row.http_status,
                    "started_at": row.started_at.isoformat(),
                    "finished_at": None if row.finished_at is None else row.finished_at.isoformat(),
                    "content_hash": row.content_hash,
                }
            )
        return {"items": items}

    def rerun(self, source_id: str, *, user, request_id: str) -> dict:
        from uuid import UUID

        source = None
        try:
            source = self.sources.get(UUID(source_id))
        except ValueError:
            source = None
        if source is None:
            source = self.sources.get_by_url(source_id)
        if source is None:
            raise NotFoundError(f"Source not found: {source_id}")
        result = _dispatch(self.session, source)
        AuditRepository(self.session).record(
            action="ingestion_run",
            actor_user_id=user.id,
            request_id=request_id,
            entity_type="source",
            entity_id=str(source.id),
            detail=result.status,
        )
        self.session.commit()
        return {
            "source_id": str(source.id),
            "status": result.status,
            "rows_upserted": result.rows_upserted,
            "detail": result.detail,
        }


def _dispatch(session, source: Source):
    url = source.source_url
    for spec in POLICY_SOURCES:
        if spec.url == url:
            return PolicyIngestionService(session).ingest_source(spec)
    for spec in OPPORTUNITY_SOURCES:
        if spec.url == url:
            return OpportunityIngestionService(session).ingest_source(spec)
    spec = SourceSpec(
        name=source.name,
        url=source.source_url,
        connector_type=source.connector_type,
    )
    return SchemeIngestionService(session).ingest_source(spec)
