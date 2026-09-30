"""Live bronze / silver / gold counts + real pipeline metrics. Guest-readable."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.ingestion import IngestionLog, Source
from app.models.schemes import SchemeVersion
from app.repositories.ingestion import (
    IngestionLogRepository,
    SourceDocumentRepository,
    SourceRepository,
)
from app.repositories.schemes import SchemeRepository
from app.services.ingestion.layers import (
    AIRFLOW_IMPLEMENTED,
    PIPELINE_STAGES,
    PRINCIPLE,
    orchestrator_name,
)
from app.services.ingestion.snapshot import raw_root


class PipelineMapService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.sources = SourceRepository(session)
        self.documents = SourceDocumentRepository(session)
        self.logs = IngestionLogRepository(session)
        self.schemes = SchemeRepository(session)

    def snapshot(self) -> dict:
        bronze = self.documents.count()
        review = self.schemes.count_by_status("needs_review")
        gold = self.schemes.count_by_status("published")
        failed = self.logs.count_failed()
        by_status = self.logs.count_by_status()
        failure_classes = self.logs.count_failure_classes()
        health = dict(
            self.session.execute(
                select(Source.health_status, func.count()).group_by(Source.health_status)
            ).all()
        )
        versions = int(self.session.scalar(select(func.count()).select_from(SchemeVersion)) or 0)
        avg_duration = self.session.scalar(
            select(func.avg(IngestionLog.duration_ms)).where(IngestionLog.duration_ms.is_not(None))
        )
        return {
            "principle": PRINCIPLE,
            "llm_votes_eligibility": False,
            "extraction_confidence_is_not_eligibility": True,
            "airflow": AIRFLOW_IMPLEMENTED,
            "orchestrator": orchestrator_name(),
            "pipeline_orchestrator_setting": settings.pipeline_orchestrator,
            "apscheduler_active_in_process": False
            if orchestrator_name() == "airflow"
            else None,
            "airflow_blocker": None
            if AIRFLOW_IMPLEMENTED
            else "Airflow DAG not yet wired; see docs/data-engineering.md",
            "robots_fail_closed": True,
            "live_feed": False,
            "interval_hours": max(1, int(settings.ingest_interval_hours)),
            "stages": list(PIPELINE_STAGES),
            "layers": {
                "bronze": {
                    "documents": bronze,
                    "path": str(raw_root()),
                    "note": "Original bytes + SHA-256. Never overwritten.",
                },
                "silver": {
                    "needs_review": review,
                    "note": "Parsed and extracted. Unverified rules are not public.",
                },
                "gold": {
                    "published": gold,
                    "note": "HITL-published versions. Old versions stay.",
                },
            },
            "dead_letter": failed,
            "active_sources": len(self.sources.list_active()),
            "source_health": {str(k): int(v) for k, v in health.items()},
            "metrics": {
                "sources_processed": int(by_status.get("ok", 0) + by_status.get("failed", 0)),
                "sources_succeeded": int(by_status.get("ok", 0)),
                "sources_failed": int(by_status.get("failed", 0)),
                "documents_fetched": bronze,
                "versions_created": versions,
                "HITL_pending": review,
                "failure_classes": failure_classes,
                "avg_pipeline_duration_ms": None if avg_duration is None else round(float(avg_duration), 2),
            },
        }
