"""Mapped tables and official reference catalogs — no invented scheme rows."""

from __future__ import annotations

import pytest
from sqlalchemy import inspect

from app.core.database import Base, check_connection, engine
from app.data.india_geography import DEPARTMENTS, DISTRICTS, ROLES, STATES
from app.models import PRODUCTION_TABLES


def test_production_table_count() -> None:
    assert len(PRODUCTION_TABLES) == 26
    assert len(set(PRODUCTION_TABLES)) == 26


def test_all_production_tables_are_mapped() -> None:
    names = set(Base.metadata.tables)
    missing = set(PRODUCTION_TABLES) - names
    assert missing == set()
    assert "document_embeddings" in names
    assert "documents" not in names


def test_migrated_database_has_production_tables() -> None:
    if not check_connection()["connected"]:
        pytest.skip("PostgreSQL not reachable")
    names = set(inspect(engine).get_table_names())
    missing = set(PRODUCTION_TABLES) - names
    assert missing == set()
    assert "document_embeddings" in names


def test_reference_catalogs() -> None:
    assert len(STATES) == 36
    assert len(ROLES) == 6
    assert len(DEPARTMENTS) == 9
    assert {code for code, _name, _hi in ROLES} == {
        "CITIZEN",
        "STUDENT",
        "CSC_OPERATOR",
        "WELFARE_OFFICER",
        "POLICY_ANALYST",
        "ADMIN",
    }


def test_district_isos_match_states() -> None:
    state_isos = {iso for _lgd, iso, _kind, _name, _hi in STATES}
    district_isos = {iso for iso, _name in DISTRICTS}
    assert district_isos <= state_isos
    assert len(DISTRICTS) == len(set(DISTRICTS))
    assert len(DISTRICTS) > 700
