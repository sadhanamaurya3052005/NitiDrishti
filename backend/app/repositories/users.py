"""User persistence. Routes never query this table directly."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.identity import Role, User, UserRole
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, User)

    def get_active(self, user_id: UUID) -> User | None:
        stmt = (
            select(User)
            .options(selectinload(User.roles), selectinload(User.profile))
            .where(User.id == user_id, User.deleted_at.is_(None))
        )
        return self.session.scalar(stmt)

    def get_by_email(self, email: str) -> User | None:
        stmt = (
            select(User)
            .options(selectinload(User.roles), selectinload(User.profile))
            .where(func.lower(User.email) == email.lower(), User.deleted_at.is_(None))
        )
        return self.session.scalar(stmt)

    def assign_role(self, user: User, role: Role) -> None:
        exists = self.session.scalar(
            select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == role.id)
        )
        if exists is None:
            self.session.add(UserRole(user_id=user.id, role_id=role.id))

    def list_active_with_role(self, code: str) -> list[User]:
        stmt = (
            select(User)
            .join(UserRole, UserRole.user_id == User.id)
            .join(Role, Role.id == UserRole.role_id)
            .where(
                Role.code == code,
                User.is_active.is_(True),
                User.deleted_at.is_(None),
            )
            .options(selectinload(User.roles), selectinload(User.profile))
        )
        return list(self.session.scalars(stmt).unique().all())
