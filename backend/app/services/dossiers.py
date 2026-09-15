"""Queue action dossiers for signed-in users only."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.actions import ActionDossier
from app.models.identity import User
from app.repositories.dossiers import DossierRepository
from app.repositories.schemes import SchemeRepository


class DossierService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.dossiers = DossierRepository(session)
        self.schemes = SchemeRepository(session)

    def create(self, user: User, scheme_id: str) -> dict:
        scheme = self.schemes.get_by_id_or_slug(scheme_id)
        loaded = self.schemes.catalog_row(scheme) if scheme is not None else None
        if loaded is None:
            raise NotFoundError(f"Scheme not found: {scheme_id}")
        head, version, _department = loaded
        row = ActionDossier(
            user_id=user.id,
            scheme_id=head.id,
            status="queued",
            scheme_name=version.name,
        )
        self.dossiers.add(row)
        self.session.commit()
        self.session.refresh(row)
        return _public(row, slug=head.slug)

    def list_mine(self, user: User) -> dict:
        rows = self.dossiers.list_for_user(user.id)
        items = []
        for row in rows:
            slug = None
            if row.scheme_id is not None:
                scheme = self.schemes.get(row.scheme_id)
                slug = scheme.slug if scheme is not None else None
            items.append(_public(row, slug=slug))
        return {"dossiers": items}


def _public(row: ActionDossier, *, slug: str | None) -> dict:
    created = row.created_at.isoformat() if row.created_at else ""
    return {
        "id": str(row.id),
        "scheme_id": slug,
        "scheme_name": row.scheme_name,
        "status": row.status,
        "created_at": created,
    }
