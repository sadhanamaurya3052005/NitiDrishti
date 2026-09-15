"""Read-side scheme catalog. Prefers Postgres; falls back to official static facts."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.data.official_schemes import OFFICIAL_SCHEMES
from app.repositories.schemes import SchemeRepository
from app.services.ingestion.serialize import to_catalog_record


class SchemeCatalogService:
    def __init__(self, session: Session) -> None:
        self.repo = SchemeRepository(session)

    def list_payload(self, *, category: str | None = None, q: str | None = None) -> dict:
        published = self.repo.published_count()
        if published:
            rows = self.repo.list_current(category=category, q=q, statuses=("published",))
            return {
                "schemes": [to_catalog_record(scheme, version, department) for scheme, version, department in rows],
                "source": "postgres",
                "published_count": published,
            }
        return {
            "schemes": _filter_static(category, q),
            "source": "static_fallback",
            "published_count": 0,
        }

    def list_schemes(self, *, category: str | None = None, q: str | None = None) -> list[dict]:
        return list(self.list_payload(category=category, q=q)["schemes"])

    def get_scheme(self, scheme_id: str) -> dict:
        loaded = self._load_published(scheme_id)
        if loaded is not None:
            scheme, version, department = loaded
            return to_catalog_record(scheme, version, department)
        for item in OFFICIAL_SCHEMES:
            if item["id"] == scheme_id or str(item["code"]).lower() == scheme_id.lower():
                return item
        raise NotFoundError(f"Scheme not found: {scheme_id}")

    def list_documents(self, scheme_id: str) -> list[dict]:
        loaded = self._load_published(scheme_id)
        if loaded is not None:
            _scheme, version, _department = loaded
            return [
                {"id": item.code, "label": item.label, "mandatory": item.is_mandatory}
                for item in version.documents
            ]
        scheme = self.get_scheme(scheme_id)
        return [
            {"id": item["id"], "label": item["label"], "mandatory": True}
            for item in scheme.get("documents", [])
        ]

    def _load_published(self, scheme_id: str):
        row = self.repo.get_by_id_or_slug(scheme_id)
        if row is None:
            return None
        return self.repo.catalog_row(row)

    def list_versions(self, scheme_id: str) -> list[dict]:
        scheme = self.repo.get_by_id_or_slug(scheme_id)
        if scheme is None:
            raise NotFoundError(f"Scheme not found: {scheme_id}")
        versions = self.repo.versions_for(scheme.id)
        return [
            {
                "id": str(item.id),
                "version_number": item.version_number,
                "name": item.name,
                "source_url": item.source_url,
                "retrieved_at": item.retrieved_at.isoformat(),
                "is_current": item.id == scheme.current_version_id,
            }
            for item in versions
        ]

    def list_updates(self, *, limit: int = 50) -> list[dict]:
        from sqlalchemy import select

        from app.models.schemes import Scheme, SchemeVersion

        stmt = (
            select(Scheme, SchemeVersion)
            .join(Scheme, SchemeVersion.scheme_id == Scheme.id)
            .order_by(SchemeVersion.retrieved_at.desc())
            .limit(min(limit, 200))
        )
        rows = list(self.repo.session.execute(stmt).all())
        updates = []
        for scheme, version in rows:
            updates.append(
                {
                    "slug": scheme.slug,
                    "name": version.name,
                    "version_number": version.version_number,
                    "retrieved_at": version.retrieved_at.isoformat(),
                    "source_url": version.source_url,
                    "change_kind": "NEW" if version.version_number == 1 else "UPDATED",
                }
            )
        return updates


def _filter_static(category: str | None, q: str | None) -> list[dict]:
    query = (q or "").strip().lower()
    items: list[dict] = []
    for scheme in OFFICIAL_SCHEMES:
        if category and category != "all" and scheme["category"] != category:
            continue
        blob = f"{scheme['name']} {scheme['nameHi']} {scheme['summary']} {scheme.get('summaryHi', '')}".lower()
        if query and query not in blob:
            continue
        items.append(scheme)
    return items
