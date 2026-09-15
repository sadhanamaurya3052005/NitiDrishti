"""Map stored scheme versions to the frozen public catalog JSON shape."""

from __future__ import annotations

from app.models.ingestion import Department
from app.models.schemes import EligibilityRule, Scheme, SchemeVersion
from app.services.ingestion.extractors import CATEGORY_BADGE


def to_catalog_record(scheme: Scheme, version: SchemeVersion, department: Department | None) -> dict:
    badge, badge_hi = CATEGORY_BADGE.get(scheme.category, CATEGORY_BADGE["other"])
    benefit = version.benefits[0] if version.benefits else None
    ministry = department.name if department else "Government of India"
    ministry_hi = department.name_hi if department else "भारत सरकार"
    return {
        "id": scheme.slug,
        "code": scheme.code or scheme.slug.upper(),
        "name": version.name,
        "nameHi": version.name_hi,
        "ministry": ministry,
        "ministryHi": ministry_hi,
        "category": scheme.category,
        "badge": badge,
        "badgeHi": badge_hi,
        "summary": version.summary,
        "summaryHi": version.summary_hi,
        "benefit": benefit.amount_text if benefit else "As notified in the official source",
        "benefitHi": benefit.label_hi if benefit else "आधिकारिक स्रोत में अधिसूचित अनुसार",
        "documents": [{"id": item.code, "label": item.label} for item in version.documents],
        "rules": [_rule_to_api(item) for item in sorted(version.rules, key=lambda row: row.sort_order)],
        "sourceUrl": version.source_url,
    }


def _rule_to_api(rule: EligibilityRule) -> dict:
    item: dict = {
        "id": rule.rule_key,
        "label": rule.label,
        "detail": rule.detail,
        "kind": rule.kind,
    }
    if rule.age_min is not None:
        item["min"] = rule.age_min
    if rule.age_max is not None:
        item["max"] = rule.age_max
    if rule.kind == "income" and rule.income_limit is not None:
        item["max"] = rule.income_limit
    ast = rule.ast_json or {}
    op = str(ast.get("op") or "").lower()
    value = ast.get("value")
    if rule.kind == "gender" and value is not None and not isinstance(value, list):
        item["equals"] = value
    if isinstance(value, list):
        item["includes"] = value
    if "min" not in item and op in {"gte", "gt"} and isinstance(value, (int, float)) and not isinstance(value, bool):
        item["min"] = value
    if "max" not in item and op in {"lte", "lt"} and isinstance(value, (int, float)) and not isinstance(value, bool):
        item["max"] = value
    return item
