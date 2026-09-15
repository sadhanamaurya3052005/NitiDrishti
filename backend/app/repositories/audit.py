"""Insert-only audit trail. Never store secrets or full profiles in `detail`."""

from __future__ import annotations

from uuid import UUID

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
