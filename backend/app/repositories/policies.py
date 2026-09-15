"""Nyay-Mitra policy heads, immutable versions, clauses and stored diffs."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.policy import Policy, PolicyChange, PolicyClause, PolicyVersion
from app.repositories.base import BaseRepository


class PolicyRepository(BaseRepository[Policy]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Policy)

    def get_by_code(self, code: str) -> Policy | None:
        return self.session.scalar(select(Policy).where(Policy.code == code))

    def get_by_id_or_code(self, value: str) -> Policy | None:
        try:
            return self.get(UUID(value))
        except ValueError:
            return self.get_by_code(value)

    def list_all(self, *, q: str | None = None, limit: int = 100) -> list[Policy]:
        stmt = select(Policy).order_by(Policy.title).limit(min(limit, 200))
        if q:
            pattern = f"%{q.strip()}%"
            stmt = stmt.where(
                or_(
                    Policy.title.ilike(pattern),
                    Policy.title_hi.ilike(pattern),
                    Policy.code.ilike(pattern),
                    Policy.issuing_body.ilike(pattern),
                )
            )
        return list(self.session.scalars(stmt).all())

    def published_count(self) -> int:
        stmt = select(func.count()).select_from(Policy)
        return int(self.session.scalar(stmt) or 0)


class PolicyVersionRepository(BaseRepository[PolicyVersion]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, PolicyVersion)

    def for_policy(self, policy_id: UUID) -> list[PolicyVersion]:
        stmt = (
            select(PolicyVersion)
            .where(PolicyVersion.policy_id == policy_id)
            .order_by(PolicyVersion.version_number.desc())
        )
        return list(self.session.scalars(stmt).all())

    def get_for_policy(self, policy_id: UUID, version_id: UUID) -> PolicyVersion | None:
        stmt = select(PolicyVersion).where(
            PolicyVersion.policy_id == policy_id,
            PolicyVersion.id == version_id,
        )
        return self.session.scalar(stmt)

    def max_version_number(self, policy_id: UUID) -> int:
        value = self.session.scalar(
            select(func.max(PolicyVersion.version_number)).where(PolicyVersion.policy_id == policy_id)
        )
        return int(value or 0)

    def count_all(self) -> int:
        stmt = select(func.count()).select_from(PolicyVersion)
        return int(self.session.scalar(stmt) or 0)


class PolicyClauseRepository(BaseRepository[PolicyClause]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, PolicyClause)

    def for_version(self, version_id: UUID) -> list[PolicyClause]:
        stmt = (
            select(PolicyClause)
            .where(PolicyClause.policy_version_id == version_id)
            .order_by(PolicyClause.sort_order, PolicyClause.clause_ref)
        )
        return list(self.session.scalars(stmt).all())


class PolicyChangeRepository(BaseRepository[PolicyChange]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, PolicyChange)

    def between(self, from_version_id: UUID, to_version_id: UUID) -> list[PolicyChange]:
        stmt = select(PolicyChange).where(
            PolicyChange.from_version_id == from_version_id,
            PolicyChange.to_version_id == to_version_id,
        )
        return list(self.session.scalars(stmt).all())
