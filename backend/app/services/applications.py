"""Signed-in application submit. Guests write zero rows. Auto-DBT is refused."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.core.rbac import has_any_role
from app.models.applications import Application
from app.models.enums import APPLICATION_STAGES
from app.models.identity import User
from app.repositories.applications import ApplicationRepository
from app.repositories.audit import AuditRepository
from app.repositories.schemes import SchemeRepository

_CREATE_STAGES = ("Discovered", "Submitted")
_STAGE_ORDER = APPLICATION_STAGES
_OFFICER_ROLES = ("WELFARE_OFFICER", "ADMIN")


class ApplicationService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.applications = ApplicationRepository(session)
        self.schemes = SchemeRepository(session)
        self.audit = AuditRepository(session)

    def create(
        self,
        user: User,
        *,
        scheme_id: str,
        district_id: str | None = None,
        stage: str | None = None,
        request_id: str,
    ) -> dict:
        chosen = stage or "Submitted"
        if chosen not in _CREATE_STAGES:
            raise ValidationError("New rows start at Discovered or Submitted. DBT is not auto-written.")
        scheme = self.schemes.get_by_id_or_slug(scheme_id)
        loaded = self.schemes.catalog_row(scheme) if scheme is not None else None
        if loaded is None:
            raise NotFoundError(f"Scheme not found: {scheme_id}")
        head, version, _department = loaded
        district_uuid = _optional_uuid(district_id)
        row = Application(
            user_id=user.id,
            scheme_id=head.id,
            district_id=district_uuid,
            stage=chosen,
        )
        self.applications.add(row)
        self.audit.record(
            action="application_submit",
            actor_user_id=user.id,
            request_id=request_id,
            entity_type="applications",
            entity_id=str(head.id),
            detail=chosen,
        )
        self.session.commit()
        self.session.refresh(row)
        return _public(row, slug=head.slug, scheme_name=version.name, official_apply_url=version.source_url)

    def list_mine(self, user: User) -> dict:
        return {"applications": [self._row_public(row) for row in self.applications.list_for_user(user.id)]}

    def list_queue(self, user: User) -> dict:
        _require_officer(user)
        return {"applications": [self._row_public(row) for row in self.applications.list_recent()]}

    def record_official_stage(self, user: User, *, application_id: UUID, stage: str, request_id: str) -> dict:
        """Officer records a department outcome. This is not a ministry API and not auto-DBT."""
        _require_officer(user)
        row = self.applications.get(application_id)
        if row is None:
            raise NotFoundError("Application not found")
        nxt = _next_stage(row.stage)
        if stage != nxt:
            raise ValidationError(f"Next official stage from {row.stage} is {nxt}")
        row.stage = stage
        self.audit.record(
            action="application_submit",
            actor_user_id=user.id,
            request_id=request_id,
            entity_type="applications",
            entity_id=str(row.id),
            detail=f"recorded_official_outcome={stage}",
        )
        self.session.commit()
        self.session.refresh(row)
        return self._row_public(row)

    def _row_public(self, row: Application) -> dict:
        slug = None
        name = ""
        official = None
        if row.scheme_id is not None:
            scheme = self.schemes.get(row.scheme_id)
            slug = scheme.slug if scheme is not None else None
            loaded = self.schemes.catalog_row(scheme) if scheme is not None else None
            if loaded is not None:
                name = loaded[1].name
                official = loaded[1].source_url
        return _public(row, slug=slug, scheme_name=name, official_apply_url=official)


def funnel_payload(counts: dict[str, int], *, has_rows: bool) -> list[dict]:
    if not has_rows:
        return [{"stage": stage, "count": None} for stage in APPLICATION_STAGES]
    return [{"stage": stage, "count": int(counts.get(stage, 0))} for stage in APPLICATION_STAGES]


def _require_officer(user: User) -> None:
    if not has_any_role((role.code for role in user.roles), _OFFICER_ROLES):
        raise ForbiddenError("Only a welfare officer or admin can record an official outcome")


def _next_stage(current: str) -> str:
    try:
        index = _STAGE_ORDER.index(current)
    except ValueError as exc:
        raise ValidationError("Unknown application stage") from exc
    if index >= len(_STAGE_ORDER) - 1:
        raise ValidationError("Application is already at the last recorded stage")
    return _STAGE_ORDER[index + 1]


def _optional_uuid(value: str | None) -> UUID | None:
    if not value:
        return None
    try:
        return UUID(value)
    except ValueError as exc:
        raise ValidationError("district_id must be a UUID") from exc


def _public(
    row: Application,
    *,
    slug: str | None,
    scheme_name: str,
    official_apply_url: str | None,
) -> dict:
    return {
        "id": str(row.id),
        "scheme_id": slug,
        "scheme_name": scheme_name,
        "district_id": None if row.district_id is None else str(row.district_id),
        "stage": row.stage,
        "official_apply_url": official_apply_url,
        "created_at": row.created_at.isoformat() if row.created_at else "",
    }
