"""Read-side scheme catalog queries."""

from __future__ import annotations

import re
from uuid import UUID

from sqlalchemy import Select, func, literal, or_, select, text
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.sql.elements import ColumnElement

from app.models.ingestion import Department
from app.models.schemes import Scheme, SchemeVersion
from app.repositories.base import BaseRepository

_LIKE_UNSAFE = re.compile(r"[%_\\]")


class SchemeRepository(BaseRepository[Scheme]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Scheme)

    def get_by_slug(self, slug: str) -> Scheme | None:
        return self.session.scalar(select(Scheme).where(Scheme.slug == slug))

    def get_by_id_or_slug(self, value: str) -> Scheme | None:
        try:
            uuid_value = UUID(value)
        except ValueError:
            return self.get_by_slug(value)
        return self.get(uuid_value)

    def catalog_row(self, scheme: Scheme) -> tuple[Scheme, SchemeVersion, Department | None] | None:
        if scheme.current_version_id is None:
            return None
        stmt = (
            select(Scheme, SchemeVersion, Department)
            .join(SchemeVersion, Scheme.current_version_id == SchemeVersion.id)
            .outerjoin(Department, Scheme.department_id == Department.id)
            .options(
                selectinload(SchemeVersion.benefits),
                selectinload(SchemeVersion.rules),
                selectinload(SchemeVersion.documents),
            )
            .where(Scheme.id == scheme.id)
        )
        return self.session.execute(stmt).first()

    def list_current(
        self,
        *,
        category: str | None = None,
        q: str | None = None,
        statuses: tuple[str, ...] = ("published",),
        limit: int = 100,
    ) -> list[tuple[Scheme, SchemeVersion, Department | None]]:
        stmt = (
            select(Scheme, SchemeVersion, Department)
            .join(SchemeVersion, Scheme.current_version_id == SchemeVersion.id)
            .outerjoin(Department, Scheme.department_id == Department.id)
            .options(
                selectinload(SchemeVersion.benefits),
                selectinload(SchemeVersion.rules),
                selectinload(SchemeVersion.documents),
            )
            .where(Scheme.status.in_(statuses))
        )
        if category and category != "all":
            stmt = stmt.where(Scheme.category == category)
        needle = (q or "").strip()
        rank = None
        if needle:
            stmt, rank = self._apply_search(stmt, needle)
        if rank is not None:
            stmt = stmt.order_by(rank.desc(), SchemeVersion.name)
        else:
            stmt = stmt.order_by(SchemeVersion.name)
        stmt = stmt.limit(min(limit, 200))
        return list(self.session.execute(stmt).all())

    def _extensions(self) -> frozenset[str]:
        cached = getattr(self, "_extension_names", None)
        if cached is not None:
            return cached
        names = frozenset(
            str(item) for item in self.session.execute(text("SELECT extname FROM pg_extension")).scalars()
        )
        self._extension_names = names
        return names

    def _fold(self, expr: ColumnElement[str]) -> ColumnElement[str]:
        if "unaccent" in self._extensions():
            return func.unaccent(expr)
        return expr

    def _apply_search(self, stmt: Select, needle: str) -> tuple[Select, ColumnElement | None]:
        cleaned = _LIKE_UNSAFE.sub("", needle)[:200]
        if not cleaned:
            return stmt, None
        pattern = f"%{cleaned}%"
        name = self._fold(SchemeVersion.name)
        name_hi = self._fold(SchemeVersion.name_hi)
        summary = self._fold(SchemeVersion.summary)
        summary_hi = self._fold(SchemeVersion.summary_hi)
        folded_pattern = self._fold(literal(pattern))
        clauses: list[ColumnElement[bool]] = [
            name.ilike(folded_pattern),
            name_hi.ilike(folded_pattern),
            summary.ilike(folded_pattern),
            summary_hi.ilike(folded_pattern),
            Scheme.code.ilike(pattern),
        ]
        rank: ColumnElement | None = None
        if "pg_trgm" in self._extensions():
            folded_query = self._fold(literal(cleaned))
            name_sim = func.similarity(name, folded_query)
            name_hi_sim = func.similarity(name_hi, folded_query)
            summary_sim = func.similarity(summary, folded_query)
            clauses.extend([name_sim > 0.2, name_hi_sim > 0.2])
            rank = func.greatest(name_sim, name_hi_sim, summary_sim)
        return stmt.where(or_(*clauses)), rank

    def versions_for(self, scheme_id: UUID) -> list[SchemeVersion]:
        stmt = (
            select(SchemeVersion)
            .where(SchemeVersion.scheme_id == scheme_id)
            .order_by(SchemeVersion.version_number.desc())
        )
        return list(self.session.scalars(stmt).all())

    def published_count(self) -> int:
        stmt = select(func.count()).select_from(Scheme).where(Scheme.status == "published")
        return int(self.session.scalar(stmt) or 0)
