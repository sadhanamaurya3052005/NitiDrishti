"""Published opportunity catalog. Empty list when nothing has been ingested."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ValidationError
from app.models.opportunities import Internship, Job, Scholarship
from app.repositories.opportunities import (
    InternshipRepository,
    JobRepository,
    ScholarshipRepository,
    opportunity_by_id,
)

KINDS = ("job", "internship", "scholarship")


class OpportunityCatalogService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.jobs = JobRepository(session)
        self.internships = InternshipRepository(session)
        self.scholarships = ScholarshipRepository(session)

    def list_all(self, *, kind: str | None = None, q: str | None = None, limit: int = 100) -> dict:
        if kind is not None and kind not in KINDS:
            raise ValidationError(f"kind must be one of {', '.join(KINDS)}")
        jobs = [] if kind and kind != "job" else [_job(row) for row in self.jobs.list_published(q=q, limit=limit)]
        internships = (
            []
            if kind and kind != "internship"
            else [_internship(row) for row in self.internships.list_published(q=q, limit=limit)]
        )
        scholarships = (
            []
            if kind and kind != "scholarship"
            else [_scholarship(row) for row in self.scholarships.list_published(q=q, limit=limit)]
        )
        items = [*jobs, *internships, *scholarships]
        items.sort(key=lambda row: row["retrieved_at"] or "", reverse=True)
        return {
            "items": items,
            "jobs": jobs,
            "internships": internships,
            "scholarships": scholarships,
            "counts": {
                "jobs": self.jobs.published_count() if kind in {None, "job"} else len(jobs),
                "internships": (
                    self.internships.published_count() if kind in {None, "internship"} else len(internships)
                ),
                "scholarships": (
                    self.scholarships.published_count() if kind in {None, "scholarship"} else len(scholarships)
                ),
            },
        }

    def get(self, item_id: str) -> dict:
        try:
            uuid_value = UUID(item_id)
        except ValueError as exc:
            raise NotFoundError(f"Opportunity not found: {item_id}") from exc
        found = opportunity_by_id(self.session, uuid_value)
        if found is None:
            raise NotFoundError(f"Opportunity not found: {item_id}")
        kind, row = found
        if row.status != "published":
            raise NotFoundError(f"Opportunity not found: {item_id}")
        if kind == "job" and isinstance(row, Job):
            return _job(row)
        if kind == "internship" and isinstance(row, Internship):
            return _internship(row)
        if isinstance(row, Scholarship):
            return _scholarship(row)
        raise NotFoundError(f"Opportunity not found: {item_id}")


def _base(kind: str, row: Job | Internship | Scholarship) -> dict:
    return {
        "id": str(row.id),
        "kind": kind,
        "title": row.title,
        "title_hi": row.title_hi,
        "summary": row.summary,
        "source_url": row.source_url,
        "retrieved_at": row.retrieved_at.isoformat(),
        "deadline": None if row.deadline is None else row.deadline.isoformat(),
        "status": row.status,
        "department_id": None if row.department_id is None else str(row.department_id),
        "state_id": None if row.state_id is None else str(row.state_id),
    }


def _job(row: Job) -> dict:
    return _base("job", row)


def _internship(row: Internship) -> dict:
    return _base("internship", row)


def _scholarship(row: Scholarship) -> dict:
    payload = _base("scholarship", row)
    payload["income_limit"] = row.income_limit
    return payload
