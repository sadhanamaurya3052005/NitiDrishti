"""Field-level validation before a scheme row is written."""

from __future__ import annotations

from app.core.exceptions import ValidationError
from app.models.enums import RULE_KINDS, SCHEME_CATEGORIES
from app.services.ingestion.payload import NormalizedScheme


def validate_scheme(scheme: NormalizedScheme) -> None:
    if not scheme.slug or not scheme.name or not scheme.source_url:
        raise ValidationError("Extracted scheme is missing slug, name, or source_url")
    if scheme.category not in SCHEME_CATEGORIES:
        raise ValidationError(f"Unsupported scheme category: {scheme.category}")
    if scheme.status not in {"draft", "published", "archived", "needs_review"}:
        raise ValidationError(f"Unsupported scheme status: {scheme.status}")
    for rule in scheme.rules:
        if rule.kind not in RULE_KINDS:
            raise ValidationError(f"Unsupported rule kind: {rule.kind}")
        if rule.age_min is not None and rule.age_max is not None and rule.age_min > rule.age_max:
            raise ValidationError("age_min must be <= age_max")
        if rule.income_limit is not None and rule.income_limit < 0:
            raise ValidationError("income_limit must be >= 0")
    if _looks_like_identity_digits(scheme.summary) or any(
        _looks_like_identity_digits(doc.label) for doc in scheme.documents
    ):
        raise ValidationError("Extracted text looks like raw identity digits; refused")


def _looks_like_identity_digits(text: str) -> bool:
    compact = "".join(ch for ch in text if ch.isdigit())
    return len(compact) == 12 and compact.isdigit() and "aadhaar" in text.lower()
