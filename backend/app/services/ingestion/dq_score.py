"""Deterministic Data Quality Score. Not eligibility. Not an LLM confidence."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from app.services.eligibility.ast_schema import validate_ast
from app.services.ingestion.payload import NormalizedScheme

DQ_VERSION = "dq-v1"
STALE_AFTER = timedelta(days=365)
EXPIRING_WITHIN = timedelta(days=30)


@dataclass(frozen=True)
class DQResult:
    score: int
    components: dict[str, int | None]
    version: str
    calculated_at: str
    blocking: bool
    freshness_status: str
    rule_validation_status: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "score": self.score,
            "components": self.components,
            "version": self.version,
            "calculated_at": self.calculated_at,
            "blocking": self.blocking,
            "freshness_status": self.freshness_status,
            "rule_validation_status": self.rule_validation_status,
        }


def compute_dq(
    scheme: NormalizedScheme,
    *,
    retrieved_at: datetime | None = None,
    effective_from=None,
    effective_to=None,
    now: datetime | None = None,
) -> DQResult:
    """Transparent weighted score. Missing evidence lowers the component; never invents fields."""
    current = now or datetime.now(UTC)
    completeness = _completeness(scheme)
    validity = _validity(scheme)
    consistency = _consistency(scheme)
    freshness, freshness_status = _freshness(retrieved_at, effective_from, effective_to, current)
    provenance = 100 if scheme.source_url else 0
    rule_completeness, rule_status = _rules(scheme)

    components: dict[str, int | None] = {
        "completeness": completeness,
        "validity": validity,
        "consistency": consistency,
        "freshness": freshness,
        "provenance": provenance,
        "rule_completeness": rule_completeness,
    }
    known = [value for value in components.values() if value is not None]
    score = round(sum(known) / len(known)) if known else 0
    blocking = bool(
        {"missing_scheme_name", "missing_provenance", "thin_summary", "no_rules"} & set(scheme.quality_flags)
        or (scheme.status == "needs_review"
        and ("no_rules" in scheme.quality_flags or not scheme.rules))
    )
    if not scheme.rules:
        blocking = True
    return DQResult(
        score=score,
        components=components,
        version=DQ_VERSION,
        calculated_at=current.isoformat(),
        blocking=blocking,
        freshness_status=freshness_status,
        rule_validation_status=rule_status,
    )


def _completeness(scheme: NormalizedScheme) -> int:
    checks = [
        bool(scheme.name and len(scheme.name) >= 8),
        bool(scheme.summary and len(scheme.summary.strip()) >= 40),
        bool(scheme.source_url),
        bool(scheme.category),
        bool(scheme.slug),
        bool(scheme.rules),
        bool(scheme.benefits),
    ]
    return round(100 * sum(1 for item in checks if item) / len(checks))


def _validity(scheme: NormalizedScheme) -> int:
    penalties = 0
    for rule in scheme.rules:
        if rule.age_min is not None and (rule.age_min < 0 or rule.age_min > 120):
            penalties += 25
        if rule.income_limit is not None and rule.income_limit < 0:
            penalties += 25
        if validate_ast(rule.ast_json):
            penalties += 20
    if "invalid_age" in scheme.quality_flags or "invalid_income" in scheme.quality_flags:
        penalties += 20
    return max(0, 100 - penalties)


def _consistency(scheme: NormalizedScheme) -> int:
    if "inconsistent_age_window" in scheme.quality_flags:
        return 40
    for rule in scheme.rules:
        if rule.age_min is not None and rule.age_max is not None and rule.age_min > rule.age_max:
            return 40
    return 100


def _freshness(
    retrieved_at: datetime | None,
    effective_from,
    effective_to,
    now: datetime,
) -> tuple[int | None, str]:
    """Retrieved_at is not effective_from. Unknown dates stay UNKNOWN, never fake FRESH."""
    status = freshness_status(retrieved_at=retrieved_at, effective_from=effective_from, effective_to=effective_to, now=now)
    if status == "EXPIRED":
        return 0, status
    if status == "EXPIRING":
        return 60, status
    if status == "STALE":
        return 40, status
    if status == "FRESH":
        return 100, status
    return None, "UNKNOWN"


def freshness_status(
    *,
    retrieved_at: datetime | None = None,
    effective_from=None,
    effective_to=None,
    now: datetime | None = None,
) -> str:
    current = now or datetime.now(UTC)
    today = current.date()
    end = _as_date(effective_to)
    if end is not None:
        if end < today:
            return "EXPIRED"
        if (end - today).days <= EXPIRING_WITHIN.days:
            return "EXPIRING"
        return "FRESH"
    if retrieved_at is not None:
        retrieved = retrieved_at if retrieved_at.tzinfo else retrieved_at.replace(tzinfo=UTC)
        if current - retrieved > STALE_AFTER:
            return "STALE"
        # Retrieval age alone cannot claim legal freshness without effective dates.
        return "UNKNOWN"
    _ = effective_from  # reserved; without effective_to we do not invent FRESH
    return "UNKNOWN"


def _as_date(value):
    if value is None:
        return None
    if hasattr(value, "hour"):
        return value.date()
    return value


def _rules(scheme: NormalizedScheme) -> tuple[int, str]:
    if not scheme.rules:
        return 0, "INVALID"
    errors = 0
    for rule in scheme.rules:
        if validate_ast(rule.ast_json):
            errors += 1
    if errors:
        return max(0, 100 - 25 * errors), "INVALID"
    score = 70
    if any(rule.kind == "income" or rule.income_limit is not None for rule in scheme.rules):
        score += 15
    if any(rule.kind == "age" for rule in scheme.rules):
        score += 15
    return min(100, score), "VALID"
