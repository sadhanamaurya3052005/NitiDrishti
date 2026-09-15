"""Idempotent reference seed: roles, departments, 36 States/UTs, districts.

No scheme rows, no beneficiary counts. Safe to re-run.
"""

from __future__ import annotations

from sqlalchemy import func, select

from app.core.database import SessionLocal
from app.data.india_geography import DEPARTMENTS, DISTRICTS, ROLES, STATES
from app.models.geography import District, State
from app.models.identity import Role
from app.models.ingestion import Department


def seed(session) -> dict[str, int]:
    added = {"roles": 0, "departments": 0, "states": 0, "districts": 0}

    for code, name, name_hi in ROLES:
        if session.scalar(select(Role).where(Role.code == code)) is None:
            session.add(Role(code=code, name=name, name_hi=name_hi))
            added["roles"] += 1

    for code, name, name_hi, url in DEPARTMENTS:
        if session.scalar(select(Department).where(Department.code == code)) is None:
            session.add(
                Department(code=code, name=name, name_hi=name_hi, ministry=name, source_url=url)
            )
            added["departments"] += 1

    session.flush()

    iso_to_id: dict[str, object] = {}
    for lgd_code, iso, kind, name, name_hi in STATES:
        row = session.scalar(select(State).where(State.iso_code == iso))
        if row is None:
            row = State(lgd_code=lgd_code, iso_code=iso, kind=kind, name=name, name_hi=name_hi)
            session.add(row)
            session.flush()
            added["states"] += 1
        iso_to_id[iso] = row.id

    unknown = sorted({iso for iso, _name in DISTRICTS if iso not in iso_to_id})
    if unknown:
        raise RuntimeError(f"District catalog references unknown state ISO codes: {unknown}")

    for iso, district_name in DISTRICTS:
        state_id = iso_to_id[iso]
        exists = session.scalar(
            select(District).where(District.state_id == state_id, District.name == district_name)
        )
        if exists is None:
            session.add(District(state_id=state_id, name=district_name, name_hi=district_name))
            added["districts"] += 1

    return added


def main() -> None:
    session = SessionLocal()
    try:
        counts = seed(session)
        session.commit()
        roles = session.scalar(select(func.count()).select_from(Role)) or 0
        departments = session.scalar(select(func.count()).select_from(Department)) or 0
        states = session.scalar(select(func.count()).select_from(State)) or 0
        districts = session.scalar(select(func.count()).select_from(District)) or 0
        print("seed_added", counts)
        print("seed_totals", {"roles": roles, "departments": departments, "states": states, "districts": districts})
        print("districts_catalog", len(DISTRICTS))
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
