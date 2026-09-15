"""Title / summary search over published schemes."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.services.schemes import SchemeCatalogService


class SearchService:
    def __init__(self, session: Session) -> None:
        self.catalog = SchemeCatalogService(session)

    def search_schemes(self, *, q: str | None = None, category: str | None = None) -> dict:
        return self.catalog.list_payload(category=category, q=q)
