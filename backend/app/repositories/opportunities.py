"""Published gazette jobs, internships and scholarships."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.opportunities import Internship, Job, Scholarship
from app.repositories.base import BaseRepository

OpportunityRow = Job | Internship | Scholarship


class JobRepository(BaseRepository[Job]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Job)

    def get_by_url(self, url: str) -> Job | None:
        return self.session.scalar(select(Job).where(Job.source_url == url))

    def get_by_hash(self, content_hash: str) -> Job | None:
        return self.session.scalar(select(Job).where(Job.content_hash == content_hash))

    def get_by_title(self, title: str) -> Job | None:
        return self.session.scalar(select(Job).where(Job.title == title))

    def list_published(self, *, q: str | None = None, limit: int = 100) -> list[Job]:
        return _list_published(self.session, Job, q=q, limit=limit)

    def published_count(self) -> int:
        return _published_count(self.session, Job)


class InternshipRepository(BaseRepository[Internship]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Internship)

    def get_by_url(self, url: str) -> Internship | None:
        return self.session.scalar(select(Internship).where(Internship.source_url == url))

    def get_by_hash(self, content_hash: str) -> Internship | None:
        return self.session.scalar(select(Internship).where(Internship.content_hash == content_hash))

    def get_by_title(self, title: str) -> Internship | None:
        return self.session.scalar(select(Internship).where(Internship.title == title))

    def list_published(self, *, q: str | None = None, limit: int = 100) -> list[Internship]:
        return _list_published(self.session, Internship, q=q, limit=limit)

    def published_count(self) -> int:
        return _published_count(self.session, Internship)


class ScholarshipRepository(BaseRepository[Scholarship]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Scholarship)

    def get_by_url(self, url: str) -> Scholarship | None:
        return self.session.scalar(select(Scholarship).where(Scholarship.source_url == url))

    def get_by_hash(self, content_hash: str) -> Scholarship | None:
        return self.session.scalar(select(Scholarship).where(Scholarship.content_hash == content_hash))

    def get_by_title(self, title: str) -> Scholarship | None:
        return self.session.scalar(select(Scholarship).where(Scholarship.title == title))

    def list_published(self, *, q: str | None = None, limit: int = 100) -> list[Scholarship]:
        return _list_published(self.session, Scholarship, q=q, limit=limit)

    def published_count(self) -> int:
        return _published_count(self.session, Scholarship)


def _list_published(
    session: Session,
    model: type[OpportunityRow],
    *,
    q: str | None,
    limit: int,
) -> list[OpportunityRow]:
    stmt = (
        select(model)
        .where(model.status == "published")
        .order_by(model.retrieved_at.desc())
        .limit(min(limit, 200))
    )
    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                model.title.ilike(pattern),
                model.title_hi.ilike(pattern),
                model.summary.ilike(pattern),
            )
        )
    return list(session.scalars(stmt).all())


def _published_count(session: Session, model: type[OpportunityRow]) -> int:
    stmt = select(func.count()).select_from(model).where(model.status == "published")
    return int(session.scalar(stmt) or 0)


def opportunity_by_id(session: Session, item_id: UUID) -> tuple[str, OpportunityRow] | None:
    job = session.get(Job, item_id)
    if job is not None:
        return "job", job
    internship = session.get(Internship, item_id)
    if internship is not None:
        return "internship", internship
    scholarship = session.get(Scholarship, item_id)
    if scholarship is not None:
        return "scholarship", scholarship
    return None
