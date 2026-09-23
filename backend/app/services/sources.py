"""Public source-status reads. Writes stay on the CLI unless an admin session covers them."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.config import settings
from app.repositories.ingestion import IngestionLogRepository, SourceRepository


class SourceStatusService:
    def __init__(self, session: Session) -> None:
        self.sources = SourceRepository(session)
        self.logs = IngestionLogRepository(session)

    def list_status(self) -> list[dict]:
        items = []
        for source in self.sources.list_active():
            latest = self.logs.latest_for_source(source.id)
            items.append(
                {
                    "id": str(source.id),
                    "name": source.name,
                    "domain": source.domain,
                    "source_url": source.source_url,
                    "connector_type": source.connector_type,
                    "last_checked_at": source.last_checked_at.isoformat() if source.last_checked_at else None,
                    "last_status": None if latest is None else latest.status,
                    "last_error_code": None if latest is None else latest.error_code,
                    "rows_upserted": 0 if latest is None else latest.rows_upserted,
                }
            )
        return items

    def snapshot(self) -> dict:
        try:
            hours = max(1, int(settings.ingest_interval_hours))
        except (TypeError, ValueError):
            hours = 24
        return {
            "sources": self.list_status(),
            "live_feed": False,
            "scheduler_enabled": bool(settings.ingest_scheduler_enabled),
            "interval_hours": hours,
            "note": "Batch refresh of official sources. Not a live government feed.",
        }
