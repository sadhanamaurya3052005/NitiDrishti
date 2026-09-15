"""Database CHECKs reject impossible eligibility bounds. Rolled back; no leftover rows."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

from app.core.database import SessionLocal, check_connection, engine
from app.models.schemes import EligibilityRule, Scheme, SchemeVersion


def _tables_ready() -> bool:
    if not check_connection()["connected"]:
        return False
    return inspect(engine).has_table("eligibility_rules")


@pytest.fixture
def session():
    if not _tables_ready():
        pytest.skip("production schema is not migrated yet")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


def test_age_min_greater_than_age_max_is_rejected(session) -> None:
    scheme = Scheme(slug="constraint-check", category="other", status="draft")
    session.add(scheme)
    session.flush()

    version = SchemeVersion(
        scheme_id=scheme.id,
        version_number=1,
        name="Constraint check",
        name_hi="Constraint check",
        source_url="https://example.gov.in/constraint-check",
        retrieved_at=datetime.now(UTC),
    )
    session.add(version)
    session.flush()

    session.add(
        EligibilityRule(
            scheme_version_id=version.id,
            rule_key="age",
            kind="age",
            label="Impossible age window",
            age_min=40,
            age_max=20,
        )
    )
    with pytest.raises(IntegrityError):
        session.flush()
    session.rollback()

    leftover = session.execute(
        text("SELECT count(*) FROM schemes WHERE slug = 'constraint-check'")
    ).scalar_one()
    assert leftover == 0
