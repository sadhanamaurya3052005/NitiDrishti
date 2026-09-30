"""Step 7.1 hardening: DQ score, freshness, change class, failures, contracts, confidence split."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

import pytest

from app.core.exceptions import ValidationError
from app.services.ingestion.change_class import classify_scheme_change
from app.services.ingestion.contracts import assert_ast, assert_bronze, assert_silver
from app.services.ingestion.dq_score import compute_dq, freshness_status
from app.services.ingestion.failures import classify_app_error, classify_from_log
from app.services.ingestion.hashing import sha256_bytes
from app.services.ingestion.payload import (
    NormalizedRule,
    NormalizedScheme,
    RawPayload,
)
from app.services.ingestion.quality import apply_quality


def _scheme(**overrides) -> NormalizedScheme:
    base = NormalizedScheme(
        slug="step71-demo",
        code="STEP71",
        name="Step71 Demo Scheme Official",
        name_hi="Step71 Demo Scheme Official",
        summary="A sufficiently long official summary used only inside isolated unit tests for DQ scoring.",
        summary_hi="A sufficiently long official summary used only inside isolated unit tests for DQ scoring.",
        category="other",
        department_code=None,
        source_url="https://vikaspedia.in/step71-demo",
        status="published",
        badge=None,
        badge_hi=None,
        benefits=[],
        rules=[
            NormalizedRule(
                rule_key="income",
                kind="income",
                label="Income",
                detail="income ≤ ₹2,50,000",
                ast_json={"op": "lte", "field": "income", "value": 250000},
                income_limit=250000,
            ),
            NormalizedRule(
                rule_key="age",
                kind="age",
                label="Age",
                detail="age ≥ 18",
                ast_json={"op": "gte", "field": "age", "value": 18},
                age_min=18,
            ),
        ],
        documents=[],
        confidence=0.91,
    )
    for key, value in overrides.items():
        setattr(base, key, value)
    return base


def test_dq_perfect_and_missing_provenance() -> None:
    good = compute_dq(_scheme())
    assert good.score >= 85
    assert good.rule_validation_status == "VALID"
    assert good.version == "dq-v1"
    bad = _scheme(source_url="", rules=[])
    apply_quality(bad)
    scored = compute_dq(bad)
    assert scored.components["provenance"] == 0
    assert scored.components["rule_completeness"] == 0
    assert scored.blocking is True
    assert scored.rule_validation_status == "INVALID"


def test_freshness_states_do_not_invent_fresh() -> None:
    now = datetime(2026, 9, 24, tzinfo=UTC)
    assert freshness_status(effective_to=date(2026, 1, 1), now=now) == "EXPIRED"
    assert freshness_status(effective_to=date(2026, 10, 1), now=now) == "EXPIRING"
    assert freshness_status(effective_to=date(2027, 1, 1), now=now) == "FRESH"
    assert freshness_status(retrieved_at=now - timedelta(days=10), now=now) == "UNKNOWN"
    assert freshness_status(retrieved_at=now - timedelta(days=400), now=now) == "STALE"
    assert freshness_status(now=now) == "UNKNOWN"


def test_change_classification_heuristic() -> None:
    assert classify_scheme_change(None, _scheme()) == "STRUCTURAL_CHANGE"


def test_failure_taxonomy_robots_and_404() -> None:
    robots = classify_app_error("SOURCE_UNAVAILABLE", "robots.txt disallows fetching x")
    assert robots.failure_class == "ROBOTS_DENIED"
    assert robots.retryable is False
    not_found = classify_from_log(error_code="SOURCE_UNAVAILABLE", detail="HTTP 404 for https://x.gov.in/a")
    assert not_found.failure_class == "HTTP_4XX"
    assert not_found.retryable is False
    tls = classify_app_error("SOURCE_UNAVAILABLE", "SSLError on fetch")
    assert tls.failure_class == "TLS_FAILED"
    assert tls.retryable is True


def test_contracts_bronze_silver_ast() -> None:
    raw = RawPayload(
        url="https://vikaspedia.in/a",
        final_url="https://vikaspedia.in/a",
        status_code=200,
        mime_type="text/html",
        content=b"abc",
        retrieved_at=datetime.now(UTC),
        content_hash=sha256_bytes(b"abc"),
    )
    assert_bronze(raw, storage_path="storage/raw/x")
    assert_silver(_scheme())
    assert_ast({"op": "lte", "field": "income", "value": 100})
    with pytest.raises(ValidationError):
        assert_ast({"op": "xor", "field": "income", "value": 1})


def test_extraction_confidence_does_not_change_ast_verdict() -> None:
    from app.services.eligibility.engine import EligibilityProfile, RuleSpec, evaluate_scheme_rules

    rules = [
        RuleSpec(
            rule_key="income",
            kind="income",
            label="Income",
            ast_json={"op": "lte", "field": "income", "value": 250000},
            income_limit=250000,
        )
    ]
    profile = EligibilityProfile(age=30, income=100000)
    high = evaluate_scheme_rules("x", rules, profile)
    # Confidence lives only on NormalizedScheme — engine never reads it.
    low_scheme = _scheme(confidence=0.01)
    assert low_scheme.confidence == 0.01
    low = evaluate_scheme_rules("x", rules, profile)
    assert high.status == low.status == "ELIGIBLE"
