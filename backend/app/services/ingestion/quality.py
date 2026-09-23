"""Data-quality flags. Missing fields stay missing — never filled with invented values."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.services.ingestion.payload import NormalizedScheme

STALE_AFTER = timedelta(days=365)


def apply_quality(scheme: NormalizedScheme, *, retrieved_at: datetime | None = None) -> list[str]:
    """Return flag codes. Completeness gaps send the row to needs_review, not the public catalog."""
    flags: list[str] = []
    if not scheme.name:
        flags.append("missing_scheme_name")
    if not scheme.source_url:
        flags.append("missing_provenance")
    if len((scheme.summary or "").strip()) < 40:
        flags.append("thin_summary")
    if not scheme.rules:
        flags.append("no_rules")
    if not any(rule.income_limit is not None or rule.kind == "income" for rule in scheme.rules):
        flags.append("missing_income_limit")
    if not any(rule.kind == "age" for rule in scheme.rules):
        flags.append("missing_age_limit")
    for rule in scheme.rules:
        if rule.age_min is not None and (rule.age_min < 0 or rule.age_min > 120):
            flags.append("invalid_age")
        if rule.income_limit is not None and rule.income_limit < 0:
            flags.append("invalid_income")
        if rule.age_min is not None and rule.age_max is not None and rule.age_min > rule.age_max:
            flags.append("inconsistent_age_window")
    if retrieved_at is not None:
        now = datetime.now(UTC)
        retrieved = retrieved_at if retrieved_at.tzinfo else retrieved_at.replace(tzinfo=UTC)
        if now - retrieved > STALE_AFTER:
            flags.append("stale_document")

    scheme.quality_flags = flags
    blocking = {
        "missing_scheme_name",
        "missing_provenance",
        "thin_summary",
        "invalid_age",
        "invalid_income",
        "inconsistent_age_window",
    }
    if blocking.intersection(flags):
        scheme.status = "needs_review"
    return flags
