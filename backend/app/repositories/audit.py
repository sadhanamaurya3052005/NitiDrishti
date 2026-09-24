"""Insert-only audit trail. Never store secrets or full profiles in `detail`."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.actions import AuditLog
from app.repositories.base import BaseRepository


class AuditRepository(BaseRepository[AuditLog]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, AuditLog)

    def record(
        self,
        *,
        action: str,
        actor_user_id: UUID | None,
        request_id: str | None,
        entity_type: str | None = None,
        entity_id: str | None = None,
        detail: str | None = None,
    ) -> AuditLog:
        row = AuditLog(
            actor_user_id=actor_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            request_id=request_id,
            detail=detail,
        )
        self.session.add(row)
        return row

    def find_application_create(self, *, actor_user_id: UUID, request_id: str) -> AuditLog | None:
        """Prior application_submit for this actor + request_id (not an officer stage record)."""
        if not request_id or request_id == "unknown":
            return None
        stmt = (
            select(AuditLog)
            .where(
                AuditLog.actor_user_id == actor_user_id,
                AuditLog.action == "application_submit",
                AuditLog.request_id == request_id,
            )
            .order_by(AuditLog.created_at.asc())
        )
        for row in self.session.scalars(stmt):
            if row.detail and row.detail.startswith("recorded_official_outcome"):
                continue
            return row
        return None

    def latest_logout_at(self, user_id: UUID) -> datetime | None:
        stmt = (
            select(AuditLog.created_at)
            .where(AuditLog.actor_user_id == user_id, AuditLog.action == "logout")
            .order_by(AuditLog.created_at.desc())
            .limit(1)
        )
        return self.session.scalar(stmt)

    def list_recent(self, *, limit: int = 40, action: str | None = None) -> list[AuditLog]:
        stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(min(max(limit, 1), 100))
        if action:
            stmt = stmt.where(AuditLog.action == action)
        return list(self.session.scalars(stmt).all())
