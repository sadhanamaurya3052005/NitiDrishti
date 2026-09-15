"""Honest catalog aggregates. No invented beneficiary or vacancy numbers."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models.actions import ActionDossier, Alert
from app.models.geography import District, State
from app.models.identity import UserProfile
from app.models.ingestion import IngestionLog, Source
from app.models.opportunities import Internship, Job, Scholarship
from app.models.schemes import Scheme, SchemeVersion


class AnalyticsRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def scheme_version_count(self) -> int:
        stmt = select(func.count()).select_from(SchemeVersion)
        return int(self.session.scalar(stmt) or 0)

    def published_scheme_count(self) -> int:
        stmt = select(func.count()).select_from(Scheme).where(Scheme.status == "published")
        return int(self.session.scalar(stmt) or 0)

    def ingestion_status_counts(self) -> dict[str, int]:
        stmt = select(IngestionLog.status, func.count()).group_by(IngestionLog.status)
        counts = {"ok": 0, "failed": 0, "running": 0}
        for status, total in self.session.execute(stmt):
            counts[str(status)] = int(total)
        return counts

    def recent_ingestion(self, *, limit: int = 8) -> list[dict]:
        stmt = (
            select(IngestionLog, Source)
            .join(Source, IngestionLog.source_id == Source.id)
            .order_by(IngestionLog.started_at.desc())
            .limit(min(limit, 50))
        )
        items: list[dict] = []
        for log_row, source in self.session.execute(stmt):
            items.append(
                {
                    "source_name": source.name,
                    "source_url": source.source_url,
                    "status": log_row.status,
                    "rows_upserted": log_row.rows_upserted,
                    "started_at": log_row.started_at.isoformat(),
                    "finished_at": None if log_row.finished_at is None else log_row.finished_at.isoformat(),
                    "error_code": log_row.error_code,
                }
            )
        return items

    def extension_enabled(self, name: str) -> bool:
        stmt = text("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = :name)")
        return bool(self.session.execute(stmt, {"name": name}).scalar())

    def list_states(self) -> list[State]:
        stmt = select(State).order_by(State.name)
        return list(self.session.scalars(stmt).all())

    def list_districts(self, state_id: UUID | None = None) -> list[tuple[District, State]]:
        stmt = select(District, State).join(State, District.state_id == State.id).order_by(State.name, District.name)
        if state_id is not None:
            stmt = stmt.where(District.state_id == state_id)
        return list(self.session.execute(stmt).all())

    def get_district(self, district_id: UUID) -> tuple[District, State] | None:
        stmt = (
            select(District, State)
            .join(State, District.state_id == State.id)
            .where(District.id == district_id)
        )
        return self.session.execute(stmt).first()

    def published_count_by_state(self, model: type[Scheme | Job | Internship | Scholarship]) -> dict[UUID, int]:
        stmt = (
            select(model.state_id, func.count())
            .where(model.status == "published", model.state_id.is_not(None))
            .group_by(model.state_id)
        )
        return {state_id: int(total) for state_id, total in self.session.execute(stmt) if state_id is not None}

    def published_national_count(self, model: type[Scheme | Job | Internship | Scholarship]) -> int:
        stmt = select(func.count()).select_from(model).where(model.status == "published", model.state_id.is_(None))
        return int(self.session.scalar(stmt) or 0)

    def consented_profiles(
        self, *, district_id: UUID | None = None, state_id: UUID | None = None
    ) -> list[UserProfile]:
        stmt = select(UserProfile).where(
            UserProfile.consent_retention.is_(True),
            UserProfile.consent_at.is_not(None),
        )
        if district_id is not None:
            stmt = stmt.where(UserProfile.district_id == district_id)
        elif state_id is not None:
            stmt = stmt.where(UserProfile.state_id == state_id)
        else:
            stmt = stmt.where(UserProfile.district_id.is_not(None))
        return list(self.session.scalars(stmt).all())

    def dossier_counts_by_district(self) -> dict[tuple[UUID, str], int]:
        stmt = (
            select(UserProfile.district_id, ActionDossier.status, func.count())
            .join(ActionDossier, ActionDossier.user_id == UserProfile.user_id)
            .where(
                UserProfile.consent_retention.is_(True),
                UserProfile.consent_at.is_not(None),
                UserProfile.district_id.is_not(None),
            )
            .group_by(UserProfile.district_id, ActionDossier.status)
        )
        counts: dict[tuple[UUID, str], int] = {}
        for district_id, status, total in self.session.execute(stmt):
            if district_id is None:
                continue
            counts[(district_id, str(status))] = int(total)
        return counts

    def alert_counts_by_district(self) -> dict[UUID, int]:
        stmt = (
            select(UserProfile.district_id, func.count())
            .join(Alert, Alert.user_id == UserProfile.user_id)
            .where(
                UserProfile.consent_retention.is_(True),
                UserProfile.consent_at.is_not(None),
                UserProfile.district_id.is_not(None),
            )
            .group_by(UserProfile.district_id)
        )
        return {district_id: int(total) for district_id, total in self.session.execute(stmt) if district_id is not None}
