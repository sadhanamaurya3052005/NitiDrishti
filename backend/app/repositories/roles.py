"""Role lookup against the seeded reference table."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.identity import Role
from app.repositories.base import BaseRepository


class RoleRepository(BaseRepository[Role]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Role)

    def get_by_code(self, code: str) -> Role | None:
        return self.session.scalar(select(Role).where(Role.code == code))
