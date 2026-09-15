"""Deterministic eligibility AST. A language model never votes."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

RuleVerdict = Literal["pass", "fail", "unknown"]
SchemeStatus = Literal["ELIGIBLE", "PARTIAL_INFO", "INELIGIBLE"]

_FIELD_ALIASES = {
    "age": "age",
    "income": "income",
    "land": "land_hectares",
    "land_hectares": "land_hectares",
    "landhectares": "land_hectares",
    "gender": "gender",
    "category": "category",
    "occupation": "occupation",
}

_COMPARE_OPS = {"eq", "neq", "gt", "gte", "lt", "lte", "in"}
_LOGIC_OPS = {"and", "or", "not", "always"}


class RuleLike(Protocol):
    rule_key: str
    kind: str
    label: str
    detail: str
    ast_json: dict[str, Any]
    age_min: int | None
    age_max: int | None
    income_limit: int | None


@dataclass(frozen=True)
class EligibilityProfile:
    age: int | None = None
    income: int | None = None
    land_hectares: float | None = None
    gender: str | None = None
    category: str | None = None
    occupation: str | None = None


@dataclass
class RuleSpec:
    """Standalone rule for unit tests — same fields as eligibility_rules rows."""

    rule_key: str
    kind: str
    label: str
    detail: str = ""
    ast_json: dict[str, Any] = field(default_factory=dict)
    age_min: int | None = None
    age_max: int | None = None
    income_limit: int | None = None


@dataclass(frozen=True)
class EvaluatedRule:
    id: str
    label: str
    detail: str
    verdict: RuleVerdict
    explanation: str


@dataclass(frozen=True)
class SchemeEvaluation:
    scheme_id: str
    status: SchemeStatus
    score: int
    rules: list[EvaluatedRule]

    def as_api(self) -> dict[str, Any]:
        return {
            "schemeId": self.scheme_id,
            "status": self.status,
            "score": self.score,
            "rules": [
                {
                    "id": item.id,
                    "label": item.label,
                    "detail": item.detail,
                    "verdict": item.verdict,
                    "explanation": item.explanation,
                }
                for item in self.rules
            ],
        }


def combine_verdicts(left: RuleVerdict, right: RuleVerdict, *, op: str) -> RuleVerdict:
    if op == "and":
        if left == "fail" or right == "fail":
            return "fail"
        if left == "unknown" or right == "unknown":
            return "unknown"
        return "pass"
    if left == "pass" or right == "pass":
        return "pass"
    if left == "unknown" or right == "unknown":
        return "unknown"
    return "fail"


def evaluate_scheme_rules(scheme_id: str, rules: list[RuleLike], profile: EligibilityProfile) -> SchemeEvaluation:
    evaluated = [evaluate_rule(rule, profile) for rule in rules]
    fails = sum(1 for item in evaluated if item.verdict == "fail")
    unknowns = sum(1 for item in evaluated if item.verdict == "unknown")
    passes = sum(1 for item in evaluated if item.verdict == "pass")
    score = round((passes / max(1, len(evaluated))) * 100)
    status: SchemeStatus = "ELIGIBLE"
    if fails:
        status = "INELIGIBLE"
    elif unknowns:
        status = "PARTIAL_INFO"
    return SchemeEvaluation(scheme_id=scheme_id, status=status, score=score, rules=evaluated)


def evaluate_rule(rule: RuleLike, profile: EligibilityProfile) -> EvaluatedRule:
    ast = rule.ast_json if isinstance(rule.ast_json, dict) else {}
    if ast.get("op") in _COMPARE_OPS | _LOGIC_OPS:
        verdict, explanation = _eval_ast(ast, profile)
        return EvaluatedRule(
            id=rule.rule_key,
            label=rule.label,
            detail=rule.detail,
            verdict=verdict,
            explanation=explanation,
        )
    return _eval_kind(rule, profile)


def _eval_kind(rule: RuleLike, profile: EligibilityProfile) -> EvaluatedRule:
    base = {"id": rule.rule_key, "label": rule.label, "detail": rule.detail}
    kind = rule.kind
    ast = rule.ast_json if isinstance(rule.ast_json, dict) else {}

    if kind == "always":
        return EvaluatedRule(
            **base,
            verdict="unknown",
            explanation="Verified against the official exclusion list at application time.",
        )

    if kind == "age":
        minimum = rule.age_min if rule.age_min is not None else _ast_bound(ast, "min")
        maximum = rule.age_max if rule.age_max is not None else _ast_bound(ast, "max")
        if minimum is None:
            minimum = 0
        if maximum is None:
            maximum = 120
        if profile.age is None:
            return EvaluatedRule(**base, verdict="unknown", explanation="Age is not declared.")
        passed = minimum <= profile.age <= maximum
        explanation = (
            f"Age {profile.age} is within {int(minimum)}-{int(maximum)}."
            if passed
            else f"Age {profile.age} is outside {int(minimum)}-{int(maximum)}."
        )
        return EvaluatedRule(**base, verdict="pass" if passed else "fail", explanation=explanation)

    if kind == "income":
        maximum = rule.income_limit if rule.income_limit is not None else _ast_bound(ast, "max")
        if maximum is None:
            maximum = float("inf")
        if profile.income is None:
            return EvaluatedRule(**base, verdict="unknown", explanation="Income is not declared.")
        passed = profile.income <= maximum
        cap = "no gazette cap" if maximum == float("inf") else f"₹{int(maximum):,}"
        actual = f"₹{profile.income:,}"
        explanation = (
            f"Income {actual} ≤ {cap}."
            if passed
            else f"Income {actual} exceeds {cap}."
        )
        return EvaluatedRule(**base, verdict="pass" if passed else "fail", explanation=explanation)

    if kind == "land":
        minimum = _ast_bound(ast, "min")
        if minimum is None:
            minimum = 0
        if profile.land_hectares is None:
            return EvaluatedRule(**base, verdict="unknown", explanation="Landholding is not declared.")
        passed = profile.land_hectares >= minimum
        explanation = (
            f"Landholding {profile.land_hectares} ha meets the cultivator test."
            if passed
            else f"Landholding {profile.land_hectares} ha is below the recorded-land threshold."
        )
        return EvaluatedRule(**base, verdict="pass" if passed else "fail", explanation=explanation)

    if kind == "gender":
        expected = ast.get("value")
        if profile.gender in (None, "any"):
            return EvaluatedRule(
                **base,
                verdict="unknown",
                explanation="Gender not declared — mark female on the profile to complete this test.",
            )
        passed = _norm(profile.gender) == _norm(expected)
        explanation = "Gender criterion matches." if passed else "Gender criterion does not match this scheme."
        return EvaluatedRule(**base, verdict="pass" if passed else "fail", explanation=explanation)

    if kind == "category":
        allowed = ast.get("value") if isinstance(ast.get("value"), list) else None
        if not allowed:
            return EvaluatedRule(**base, verdict="unknown", explanation="Needs an official document check.")
        if profile.category is None:
            return EvaluatedRule(**base, verdict="unknown", explanation="Category is not declared.")
        passed = _norm(profile.category) in {_norm(item) for item in allowed}
        joined = ", ".join(str(item) for item in allowed)
        explanation = (
            f"Category {profile.category} is listed."
            if passed
            else f"Category {profile.category} is not in {joined}."
        )
        return EvaluatedRule(**base, verdict="pass" if passed else "fail", explanation=explanation)

    if kind == "occupation":
        allowed = ast.get("value") if isinstance(ast.get("value"), list) else None
        if not allowed:
            return EvaluatedRule(**base, verdict="unknown", explanation="Needs an official document check.")
        if profile.occupation is None:
            return EvaluatedRule(**base, verdict="unknown", explanation="Occupation is not declared.")
        passed = _norm(profile.occupation) in {_norm(item) for item in allowed}
        joined = ", ".join(str(item) for item in allowed)
        explanation = (
            f"Occupation {profile.occupation} is in the notified set."
            if passed
            else f"Occupation {profile.occupation} is outside {joined}."
        )
        return EvaluatedRule(**base, verdict="pass" if passed else "fail", explanation=explanation)

    return EvaluatedRule(**base, verdict="unknown", explanation="Needs an official document check.")


def _eval_ast(node: dict[str, Any], profile: EligibilityProfile) -> tuple[RuleVerdict, str]:
    op = str(node.get("op") or "").lower()
    if op == "always":
        return "unknown", "Verified against the official exclusion list at application time."
    if op == "and":
        return _eval_logic(node, profile, op="and")
    if op == "or":
        return _eval_logic(node, profile, op="or")
    if op == "not":
        child = node.get("child") if isinstance(node.get("child"), dict) else None
        children = node.get("children") if isinstance(node.get("children"), list) else []
        target = child or (children[0] if children and isinstance(children[0], dict) else None)
        if not isinstance(target, dict):
            return "unknown", "Rule is missing a negated clause."
        verdict, explanation = _eval_ast(target, profile)
        if verdict == "pass":
            return "fail", explanation
        if verdict == "fail":
            return "pass", explanation
        return "unknown", explanation
    if op in _COMPARE_OPS:
        return _eval_compare(node, profile)
    return "unknown", "Needs an official document check."


def _eval_logic(node: dict[str, Any], profile: EligibilityProfile, *, op: str) -> tuple[RuleVerdict, str]:
    raw = node.get("children") or node.get("args") or []
    children = [item for item in raw if isinstance(item, dict)]
    if not children:
        return ("pass" if op == "and" else "fail"), "Empty logical clause."
    verdict: RuleVerdict = "pass" if op == "and" else "fail"
    explanations: list[str] = []
    for child in children:
        child_verdict, explanation = _eval_ast(child, profile)
        explanations.append(explanation)
        verdict = combine_verdicts(verdict, child_verdict, op=op)
    joiner = " and " if op == "and" else " or "
    return verdict, joiner.join(explanations)


def _eval_compare(node: dict[str, Any], profile: EligibilityProfile) -> tuple[RuleVerdict, str]:
    op = str(node.get("op") or "").lower()
    field = _FIELD_ALIASES.get(str(node.get("field") or "").replace("-", "_").lower())
    expected = node.get("value")
    if field is None:
        return "unknown", "Needs an official document check."
    actual = _read_field(profile, field)
    if actual is None:
        return "unknown", _undeclared_message(field)

    if op == "in":
        options = expected if isinstance(expected, list) else [expected]
        passed = any(_values_equal(actual, item) for item in options)
        joined = ", ".join(str(item) for item in options)
        explanation = (
            f"{field} {actual} is listed."
            if passed
            else f"{field} {actual} is not in {joined}."
        )
        return ("pass" if passed else "fail"), explanation

    if op in {"eq", "neq"}:
        matched = _values_equal(actual, expected)
        passed = matched if op == "eq" else not matched
        explanation = (
            f"{field} matches {expected}."
            if passed
            else f"{field} {actual} does not match {expected}."
        )
        return ("pass" if passed else "fail"), explanation

    try:
        left = float(actual)
        right = float(expected)
    except (TypeError, ValueError):
        return "unknown", "Needs an official document check."

    passed = {
        "gt": left > right,
        "gte": left >= right,
        "lt": left < right,
        "lte": left <= right,
    }[op]
    if field == "age":
        explanation = (
            f"Age {int(left)} is within the gazette bound ({op} {int(right)})."
            if passed
            else f"Age {int(left)} is outside the gazette bound ({op} {int(right)})."
        )
        return ("pass" if passed else "fail"), explanation
    if field == "income":
        explanation = (
            f"Income ₹{int(left):,} satisfies {op} ₹{int(right):,}."
            if passed
            else f"Income ₹{int(left):,} fails {op} ₹{int(right):,}."
        )
        return ("pass" if passed else "fail"), explanation
    if field == "land_hectares":
        explanation = (
            f"Landholding {left} ha meets the cultivator test."
            if passed
            else f"Landholding {left} ha is below the recorded-land threshold."
        )
        return ("pass" if passed else "fail"), explanation
    return ("pass" if passed else "fail"), f"{field} {left} {op} {right} is {passed}."


def _read_field(profile: EligibilityProfile, field: str) -> Any:
    if field == "age":
        return profile.age
    if field == "income":
        return profile.income
    if field == "land_hectares":
        return profile.land_hectares
    if field == "gender":
        if profile.gender in (None, "any"):
            return None
        return profile.gender
    if field == "category":
        return profile.category
    if field == "occupation":
        return profile.occupation
    return None


def _undeclared_message(field: str) -> str:
    if field == "gender":
        return "Gender not declared — mark female on the profile to complete this test."
    labels = {
        "age": "Age is not declared.",
        "income": "Income is not declared.",
        "land_hectares": "Landholding is not declared.",
        "category": "Category is not declared.",
        "occupation": "Occupation is not declared.",
    }
    return labels.get(field, "Needs an official document check.")


def _ast_bound(ast: dict[str, Any], which: str) -> float | None:
    op = str(ast.get("op") or "").lower()
    value = ast.get("value")
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if which == "min" and op in {"gte", "gt"}:
        return number
    if which == "max" and op in {"lte", "lt"}:
        return number
    return None


def _norm(value: Any) -> str:
    return str(value).strip().lower()


def _values_equal(left: Any, right: Any) -> bool:
    if isinstance(left, (int, float)) and isinstance(right, (int, float)):
        return float(left) == float(right)
    return _norm(left) == _norm(right)
