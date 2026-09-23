"""Application rows for the welfare funnel. No identity digits."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.applications import Application
from app.repositories.base import BaseRepository


class ApplicationRepository(BaseRepository[Application]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Application)

    def list_for_user(self, user_id: UUID) -> list[Application]:
        stmt = (
            select(Application)
            .where(Application.user_id == user_id)
            .order_by(Application.created_at.desc())
            .limit(200)
        )
        return list(self.session.scalars(stmt).all())

    def list_recent(self, *, limit: int = 40) -> list[Application]:
        stmt = select(Application).order_by(Application.created_at.desc()).limit(min(max(limit, 1), 100))
        return list(self.session.scalars(stmt).all())

    def stage_counts(self, *, district_id: UUID | None = None) -> dict[str, int]:
        stmt = select(Application.stage, func.count()).group_by(Application.stage)
        if district_id is not None:
            stmt = stmt.where(Application.district_id == district_id)
        return {str(stage): int(total) for stage, total in self.session.execute(stmt)}

    def exists_any(self) -> bool:
        return self.count() > 0
