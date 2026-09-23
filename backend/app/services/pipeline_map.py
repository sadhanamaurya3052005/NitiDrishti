"""Live bronze / silver / gold counts. Guest-readable. No Airflow claim."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.config import settings
from app.repositories.ingestion import IngestionLogRepository, SourceDocumentRepository, SourceRepository
from app.repositories.schemes import SchemeRepository
from app.services.ingestion.layers import AIRFLOW_IMPLEMENTED, ORCHESTRATOR, PIPELINE_STAGES, PRINCIPLE
from app.services.ingestion.snapshot import raw_root


class PipelineMapService:
    def __init__(self, session: Session) -> None:
        self.sources = SourceRepository(session)
        self.documents = SourceDocumentRepository(session)
        self.logs = IngestionLogRepository(session)
        self.schemes = SchemeRepository(session)

    def snapshot(self) -> dict:
        bronze = self.documents.count()
        review = self.schemes.count_by_status("needs_review")
        gold = self.schemes.count_by_status("published")
        failed = self.logs.count_failed()
        return {
            "principle": PRINCIPLE,
            "llm_votes_eligibility": False,
            "airflow": AIRFLOW_IMPLEMENTED,
            "orchestrator": ORCHESTRATOR,
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
        }
