"""Content-hash document skip and normalized-scheme fingerprints."""

from __future__ import annotations

from app.models.schemes import SchemeVersion
from app.services.ingestion.hashing import canonical_json_hash
from app.services.ingestion.payload import NormalizedScheme


def scheme_fingerprint(scheme: NormalizedScheme) -> str:
    return canonical_json_hash(
        {
            "name": scheme.name,
            "name_hi": scheme.name_hi,
            "summary": scheme.summary,
            "summary_hi": scheme.summary_hi,
            "benefits": [(item.label, item.amount_text, item.amount_paise) for item in scheme.benefits],
            "rules": [
                (item.rule_key, item.kind, item.ast_json, item.age_min, item.age_max, item.income_limit)
                for item in scheme.rules
            ],
            "documents": [(item.code, item.label, item.is_mandatory) for item in scheme.documents],
        }
    )


def version_fingerprint(version: SchemeVersion) -> str:
    return canonical_json_hash(
        {
            "name": version.name,
            "name_hi": version.name_hi,
            "summary": version.summary,
            "summary_hi": version.summary_hi,
            "benefits": [(item.label, item.amount_text, item.amount_paise) for item in version.benefits],
            "rules": [
                (item.rule_key, item.kind, item.ast_json, item.age_min, item.age_max, item.income_limit)
                for item in version.rules
            ],
            "documents": [(item.code, item.label, item.is_mandatory) for item in version.documents],
        }
    )


def detect_change_kind(previous: SchemeVersion | None, incoming: NormalizedScheme) -> str:
    if previous is None:
        return "NEW"
    prev_benefits = {(item.label, item.amount_text) for item in previous.benefits}
    new_benefits = {(item.label, item.amount_text) for item in incoming.benefits}
    prev_rules = {(item.rule_key, item.kind, str(item.ast_json)) for item in previous.rules}
    new_rules = {(item.rule_key, item.kind, str(item.ast_json)) for item in incoming.rules}
    if prev_benefits != new_benefits:
        return "BENEFIT_CHANGED"
    if prev_rules != new_rules:
        return "ELIGIBILITY_CHANGED"
    if previous.name != incoming.name or previous.summary != incoming.summary:
        return "UPDATED"
    return "UPDATED"
