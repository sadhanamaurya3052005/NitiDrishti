"""Authenticated alerts only. Guest callers never reach this service."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, NotFoundError, ValidationError
from app.models.actions import Alert
from app.models.enums import ALERT_TYPES
from app.models.identity import User
from app.models.schemes import Scheme
from app.repositories.alerts import AlertRepository
from app.repositories.schemes import SchemeRepository
from app.schemas.block_e import AlertCreateRequest


class AlertService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.alerts = AlertRepository(session)
        self.schemes = SchemeRepository(session)

    def list_mine(self, user: User) -> list[dict]:
        return [_alert(row) for row in self.alerts.list_for_user(user.id)]

    def create(self, user: User, payload: AlertCreateRequest) -> dict:
        if payload.alert_type not in ALERT_TYPES:
            raise ValidationError("Unknown alert_type")
        scheme = self._published_scheme(payload.scheme_id)
        existing = self.alerts.find_unique(user.id, payload.scheme_id, payload.alert_type)
        if existing is not None:
            raise BusinessRuleError("An alert of this type already exists for that scheme")
        row = Alert(
            user_id=user.id,
            scheme_id=payload.scheme_id,
            alert_type=payload.alert_type,
            payload=_with_scheme_facts(payload.payload, scheme),
        )
        self.alerts.add(row)
        self.session.commit()
        self.session.refresh(row)
        return _alert(row)

    def mark_read(self, user: User, alert_id: str) -> dict:
        row = self._owned(user, alert_id)
        self.alerts.mark_read(row)
        self.session.commit()
        self.session.refresh(row)
        return _alert(row)

    def scan_published(self, user: User, *, limit: int = 10) -> dict:
        """Create NEW_SCHEME_MATCH rows for real published catalog items the user lacks.

        This is a catalog presence notice, not an eligibility decision.
        """
        created = 0
        skipped = 0
        rows = self.schemes.list_current(statuses=("published",), limit=min(limit, 20))
        for scheme, version, _department in rows:
            existing = self.alerts.find_unique(user.id, scheme.id, "NEW_SCHEME_MATCH")
            if existing is not None:
                skipped += 1
                continue
            self.alerts.add(
                Alert(
                    user_id=user.id,
                    scheme_id=scheme.id,
                    alert_type="NEW_SCHEME_MATCH",
                    payload={
                        "scheme_name": version.name,
                        "source_url": version.source_url,
                        "retrieved_at": version.retrieved_at.isoformat(),
                        "notice": "Published official scheme in the catalog. Eligibility is not decided here.",
                    },
                )
            )
            created += 1
        self.session.commit()
        return {"created": created, "skipped": skipped, "alerts": self.list_mine(user)}

    def _owned(self, user: User, alert_id: str) -> Alert:
        try:
            uuid_value = UUID(alert_id)
        except ValueError as exc:
            raise NotFoundError(f"Alert not found: {alert_id}") from exc
        row = self.alerts.get_for_user(user.id, uuid_value)
        if row is None:
            raise NotFoundError(f"Alert not found: {alert_id}")
        return row

    def _published_scheme(self, scheme_id: UUID | None) -> Scheme | None:
        if scheme_id is None:
            return None
        scheme = self.schemes.get(scheme_id)
        if scheme is None or scheme.status != "published":
            raise NotFoundError("Published scheme not found")
        return scheme


def _with_scheme_facts(payload: dict, scheme: Scheme | None) -> dict:
    data = dict(payload)
    if scheme is not None:
        data.setdefault("scheme_code", scheme.code)
        data.setdefault("scheme_slug", scheme.slug)
    return data


def _alert(row: Alert) -> dict:
    return {
        "id": str(row.id),
        "scheme_id": None if row.scheme_id is None else str(row.scheme_id),
        "alert_type": row.alert_type,
        "payload": row.payload or {},
        "read_at": None if row.read_at is None else row.read_at.isoformat(),
        "created_at": row.created_at.isoformat(),
    }
