"""Flag contradictory numeric caps on one scheme version. Does not change the vote."""

from __future__ import annotations

from typing import Any


def detect_rule_conflicts(rules: list[Any]) -> list[dict[str, Any]]:
    caps: list[tuple[str, int]] = []
    for rule in rules:
        ast = rule.ast_json if isinstance(getattr(rule, "ast_json", None), dict) else {}
        field = str(ast.get("field") or "").lower()
        op = str(ast.get("op") or "").lower()
        cap = getattr(rule, "income_limit", None)
        if cap is None and field in {"income"} and op in {"lte", "lt"}:
            raw = ast.get("value")
            if isinstance(raw, (int, float)) and not isinstance(raw, bool):
                cap = int(raw)
        if cap is None and getattr(rule, "kind", None) == "income":
            cap = getattr(rule, "income_limit", None)
        if cap is not None:
            caps.append((getattr(rule, "rule_key", "income"), int(cap)))
    unique = {value for _key, value in caps}
    if len(unique) <= 1:
        return []
    return [
        {
            "kind": "income_cap",
            "message": "Multiple income limits on one version. Human review required before treating either as sole law.",
            "values": sorted(unique),
            "rules": [key for key, _value in caps],
        }
    ]
