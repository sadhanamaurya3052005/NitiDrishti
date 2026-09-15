"""Eligibility profile rows. No identity-document columns exist on this table."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.identity import UserProfile
from app.repositories.base import BaseRepository


class ProfileRepository(BaseRepository[UserProfile]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, UserProfile)

    def get_by_user(self, user_id: UUID) -> UserProfile | None:
        return self.session.scalar(select(UserProfile).where(UserProfile.user_id == user_id))
