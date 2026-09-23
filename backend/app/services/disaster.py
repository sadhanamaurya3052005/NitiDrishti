"""Catalog-only disaster decision support. Not an NDMA feed and not PostGIS."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import BusinessRuleError, ValidationError
from app.data.india_geography import DISTRICTS, STATES
from app.models.geography import State
from app.repositories.schemes import SchemeRepository
from app.services.ingestion.serialize import to_catalog_record

_DISABLED_REASON = "FEATURE_DISASTER_MODULE is off"
_EMPTY_REASON = "No published disaster-sector schemes in the catalog."
_GEOMETRY = "bundled_topojson_name_join"


def _disabled_payload() -> dict:
    return {
        "enabled": False,
        "ndma_live": False,
        "postgis": False,
        "geometry": None,
        "source": "disabled",
        "published_count": 0,
        "schemes": [],
        "states": [],
        "districts": [],
        "focus": None,
        "reason": _DISABLED_REASON,
    }


def _state_iso_map() -> dict[str, tuple[str, str]]:
    return {row[1]: (row[3], row[4]) for row in STATES}


def _bundled_districts(iso: str) -> list[str]:
    code = iso.strip().upper()
    return [name for state_iso, name in DISTRICTS if state_iso == code]


def _match_district(iso: str, name: str) -> str | None:
    wanted = name.strip().casefold()
    for item in _bundled_districts(iso):
        if item.casefold() == wanted:
            return item
    return None


class DisasterService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repo = SchemeRepository(session)

    def summary(self, *, state_iso: str | None = None, district_name: str | None = None) -> dict:
        if not settings.feature_disaster_module:
            return _disabled_payload()
        focus = None
        if state_iso or district_name:
            focus = self._resolve_focus(state_iso or "", district_name or "")
        return self._catalog_payload(focus=focus)

    def focus(self, *, state_iso: str, district_name: str) -> dict:
        if not settings.feature_disaster_module:
            raise BusinessRuleError(_DISABLED_REASON)
        resolved = self._resolve_focus(state_iso, district_name)
        return self._catalog_payload(focus=resolved)

    def _resolve_focus(self, state_iso: str, district_name: str) -> dict:
        iso = state_iso.strip().upper()
        names = _state_iso_map()
        if iso not in names:
            raise ValidationError("State ISO is not in the bundled States/UT list")
        matched = _match_district(iso, district_name)
        if matched is None:
            raise ValidationError("District name is not in the bundled LGD list for that state")
        name, name_hi = names[iso]
        return {
            "state_iso": iso,
            "state_name": name,
            "state_name_hi": name_hi,
            "district_name": matched,
        }

    def _catalog_payload(self, *, focus: dict | None) -> dict:
        rows = self.repo.list_current(category="disaster", statuses=("published",), limit=200)
        schemes: list[dict] = []
        linked_isos: set[str] = set()
        iso_by_id: dict = {}
        state_ids = {scheme.state_id for scheme, _version, _department in rows if scheme.state_id is not None}
        if state_ids:
            loaded = list(self.session.scalars(select(State).where(State.id.in_(state_ids))).all())
            iso_by_id = {row.id: row.iso_code for row in loaded}
        for scheme, version, department in rows:
            record = to_catalog_record(scheme, version, department)
            iso = iso_by_id.get(scheme.state_id) if scheme.state_id is not None else None
            if iso:
                linked_isos.add(iso)
            if focus and iso and iso != focus["state_iso"]:
                continue
            schemes.append(
                {
                    "id": record["id"],
                    "name": record["name"],
                    "name_hi": record["nameHi"],
                    "source_url": record["sourceUrl"],
                    "category": "disaster",
                    "state_iso": iso,
                    "coverage": "state" if iso else "national_catalog",
                }
            )
        names = _state_iso_map()
        states_out = []
        for iso in sorted(linked_isos):
            label = names.get(iso)
            districts = _bundled_districts(iso)
            states_out.append(
                {
                    "iso_code": iso,
                    "name": label[0] if label else iso,
                    "name_hi": label[1] if label else iso,
                    "bundled_district_count": len(districts),
                }
            )
        districts_out: list[dict] = []
        if focus:
            districts_out.append(
                {
                    "name": focus["district_name"],
                    "state_iso": focus["state_iso"],
                    "geometry": _GEOMETRY,
                }
            )
        reason = None if schemes else _EMPTY_REASON
        if focus and not schemes:
            reason = "No published disaster-sector schemes match that bundled district's state."
        return {
            "enabled": True,
            "ndma_live": False,
            "postgis": False,
            "geometry": _GEOMETRY,
            "source": "postgres_catalog",
            "published_count": len(schemes) if focus else len(rows),
            "schemes": schemes,
            "states": states_out,
            "districts": districts_out,
            "focus": focus,
            "reason": reason,
        }
