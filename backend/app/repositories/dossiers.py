"""Action dossier rows. Guests never insert."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.actions import ActionDossier
from app.repositories.base import BaseRepository


class DossierRepository(BaseRepository[ActionDossier]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, ActionDossier)

    def list_for_user(self, user_id: UUID, *, limit: int = 50) -> list[ActionDossier]:
        stmt = (
            select(ActionDossier)
            .where(ActionDossier.user_id == user_id)
            .order_by(ActionDossier.created_at.desc())
            .limit(min(limit, 100))
        )
        return list(self.session.scalars(stmt).all())
