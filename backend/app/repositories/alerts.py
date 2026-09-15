"""Per-user alerts. Guests never reach this repository."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.actions import Alert
from app.repositories.base import BaseRepository


class AlertRepository(BaseRepository[Alert]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Alert)

    def list_for_user(self, user_id: UUID, *, limit: int = 100) -> list[Alert]:
        stmt = (
            select(Alert)
            .where(Alert.user_id == user_id)
            .order_by(Alert.created_at.desc())
            .limit(min(limit, 200))
        )
        return list(self.session.scalars(stmt).all())

    def get_for_user(self, user_id: UUID, alert_id: UUID) -> Alert | None:
        stmt = select(Alert).where(Alert.id == alert_id, Alert.user_id == user_id)
        return self.session.scalar(stmt)

    def find_unique(self, user_id: UUID, scheme_id: UUID | None, alert_type: str) -> Alert | None:
        stmt = select(Alert).where(
            Alert.user_id == user_id,
            Alert.scheme_id == scheme_id,
            Alert.alert_type == alert_type,
        )
        return self.session.scalar(stmt)

    def list_unread_of_type(self, user_id: UUID, alert_type: str) -> list[Alert]:
        stmt = select(Alert).where(
            Alert.user_id == user_id,
            Alert.alert_type == alert_type,
            Alert.read_at.is_(None),
        )
        return list(self.session.scalars(stmt).all())

    def mark_read(self, alert: Alert) -> Alert:
        if alert.read_at is None:
            alert.read_at = datetime.now(UTC)
            self.session.flush()
        return alert
