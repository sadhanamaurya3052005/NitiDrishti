"""Counterfactual unlocks from a completed AST evaluation. Never advises falsifying facts."""

from __future__ import annotations

from typing import Any


def unlock_hints(evaluation: dict[str, Any]) -> list[dict[str, Any]]:
    hints: list[dict[str, Any]] = []
    for rule in evaluation.get("rules") or []:
        if rule.get("verdict") != "fail":
            continue
        explanation = str(rule.get("explanation") or "")
        hint = _from_income(explanation) or _from_age(explanation) or {
            "ruleId": rule.get("id"),
            "kind": "other",
            "message": explanation or "This gazette test failed. Do not alter declared facts to pass it.",
        }
        if "ruleId" not in hint:
            hint["ruleId"] = rule.get("id")
        hints.append(hint)
    return hints


def _from_income(explanation: str) -> dict[str, Any] | None:
    if "exceeds" not in explanation.lower() or "₹" not in explanation:
        return None
    return {
        "kind": "income",
        "message": explanation + " A lawful change in income (not a false declaration) may unlock this rule.",
    }


def _from_age(explanation: str) -> dict[str, Any] | None:
    if "outside" not in explanation.lower():
        return None
    return {
        "kind": "age",
        "message": explanation + " Age cannot be manipulated; wait until the bound or this scheme does not apply.",
    }
