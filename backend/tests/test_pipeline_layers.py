"""Medallion ingest: normalize, quality flags, SHA skip, pipeline map."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from app.main import app
from app.services.ingestion.extractors import extract_schemes
from app.services.ingestion.hashing import sha256_bytes
from app.services.ingestion.layers import AIRFLOW_IMPLEMENTED, PIPELINE_STAGES
from app.services.ingestion.normalize import date_from_text, rupees_from_text
from app.services.ingestion.payload import ParsedDocument, RawPayload, SourceSpec
from app.services.ingestion.quality import apply_quality


def _parsed(text: str) -> ParsedDocument:
    raw = b"gazette-body"
    return ParsedDocument(
        payload=RawPayload(
            url="https://vikaspedia.in/scheme",
            final_url="https://vikaspedia.in/scheme",
            status_code=200,
            mime_type="text/html",
            content=raw,
            retrieved_at=datetime.now(UTC),
            content_hash=sha256_bytes(raw),
        ),
        title="Example Farmer Support Scheme Page",
        text=text,
    )


def test_rupees_and_dates_normalise_without_inventing() -> None:
    assert rupees_from_text("must not exceed ₹2,50,000") == 250000
    assert rupees_from_text("Rs. 2.5 lakh") == 250000
    assert rupees_from_text("INR 250000") == 250000
    assert rupees_from_text("no money mentioned") is None
    assert date_from_text("effective 01/04/2026") == date_from_text("2026-04-01")
    assert date_from_text("1 April 2026") is not None
    assert date_from_text("undated circular") is None


def test_income_rule_extracts_to_ast_not_llm_vote() -> None:
    spec = SourceSpec(name="Example", url="https://vikaspedia.in/scheme", connector_type="html")
    text = (
        "Applicant must be above 18 years and annual family income must not exceed Rs. 2,50,000. "
        "This gazette paragraph is long enough to count as a real official summary for farmers."
    )
    schemes = extract_schemes(_parsed(text), spec)
    assert len(schemes) == 1
    income = next(rule for rule in schemes[0].rules if rule.kind == "income")
    assert income.income_limit == 250000
    assert income.ast_json == {"op": "lte", "field": "income", "value": 250000}


def test_quality_flags_missing_fields_without_filling_them() -> None:
    spec = SourceSpec(name="Thin", url="https://vikaspedia.in/thin", connector_type="html")
    schemes = extract_schemes(_parsed("Short."), spec)
    assert schemes
    flags = apply_quality(schemes[0], retrieved_at=datetime.now(UTC) - timedelta(days=400))
    assert "thin_summary" in flags
    assert schemes[0].status == "needs_review"
    assert "stale_document" in flags


def test_pipeline_map_is_public_and_honest() -> None:
    payload = TestClient(app).get("/api/v1/pipeline").json()
    assert payload["success"] is True
    data = payload["data"]
    assert data["airflow"] is AIRFLOW_IMPLEMENTED
    assert data["airflow"] is False
    assert data["llm_votes_eligibility"] is False
    assert data["robots_fail_closed"] is True
    assert data["stages"] == list(PIPELINE_STAGES)
    assert "bronze" in data["layers"]
    assert "silver" in data["layers"]
    assert "gold" in data["layers"]
    assert isinstance(data["layers"]["gold"]["published"], int)
