"""Deterministic AST engine - pass/fail/unknown, never an LLM vote."""

from __future__ import annotations

from app.services.eligibility.engine import (
    EligibilityProfile,
    RuleSpec,
    evaluate_rule,
    evaluate_scheme_rules,
)


def _profile(**kwargs: object) -> EligibilityProfile:
    return EligibilityProfile(**kwargs)  # type: ignore[arg-type]


def test_age_min_max_pass_and_fail() -> None:
    rule = RuleSpec(rule_key="age", kind="age", label="Age window", age_min=18, age_max=40)
    passed = evaluate_rule(rule, _profile(age=25))
    assert passed.verdict == "pass"
    assert "18-40" in passed.explanation

    too_young = evaluate_rule(rule, _profile(age=17))
    assert too_young.verdict == "fail"
    assert "outside" in too_young.explanation

    too_old = evaluate_rule(rule, _profile(age=41))
    assert too_old.verdict == "fail"

    unknown = evaluate_rule(rule, _profile(age=None))
    assert unknown.verdict == "unknown"


def test_ast_income_lte_pass_fail() -> None:
    rule = RuleSpec(
        rule_key="income",
        kind="income",
        label="Income cap",
        ast_json={"op": "lte", "field": "income", "value": 100000},
        income_limit=100000,
    )
    assert evaluate_rule(rule, _profile(income=50000)).verdict == "pass"
    failed = evaluate_rule(rule, _profile(income=200000))
    assert failed.verdict == "fail"
    assert "fail" in failed.explanation.lower() or "exceeds" in failed.explanation.lower() or "fails" in failed.explanation.lower()


def test_ast_and_age_and_gender() -> None:
    rule = RuleSpec(
        rule_key="mother",
        kind="gender",
        label="Adult woman",
        ast_json={
            "op": "and",
            "children": [
                {"op": "gte", "field": "age", "value": 18},
                {"op": "eq", "field": "gender", "value": "female"},
            ],
        },
    )
    assert evaluate_rule(rule, _profile(age=22, gender="female")).verdict == "pass"
    assert evaluate_rule(rule, _profile(age=16, gender="female")).verdict == "fail"
    assert evaluate_rule(rule, _profile(age=22, gender="male")).verdict == "fail"
    assert evaluate_rule(rule, _profile(age=22, gender="any")).verdict == "unknown"


def test_kind_always_is_unknown() -> None:
    rule = RuleSpec(rule_key="exclusion", kind="always", label="Source exclusion")
    assert evaluate_rule(rule, _profile(age=30)).verdict == "unknown"


def test_land_ast_gte() -> None:
    rule = RuleSpec(
        rule_key="land",
        kind="land",
        label="Cultivator",
        ast_json={"op": "gte", "field": "land_hectares", "value": 0.01},
    )
    assert evaluate_rule(rule, _profile(land_hectares=1.2)).verdict == "pass"
    assert evaluate_rule(rule, _profile(land_hectares=0)).verdict == "fail"


def test_scheme_overall_status() -> None:
    rules = [
        RuleSpec(rule_key="age", kind="age", label="Age", age_min=18, age_max=60),
        RuleSpec(
            rule_key="gender",
            kind="gender",
            label="Woman",
            ast_json={"op": "eq", "field": "gender", "value": "female"},
        ),
    ]
    eligible = evaluate_scheme_rules("pmmvy", rules, _profile(age=28, gender="female"))
    assert eligible.status == "ELIGIBLE"
    assert eligible.score == 100

    partial = evaluate_scheme_rules("pmmvy", rules, _profile(age=28, gender="any"))
    assert partial.status == "PARTIAL_INFO"

    ineligible = evaluate_scheme_rules("pmmvy", rules, _profile(age=12, gender="female"))
    assert ineligible.status == "INELIGIBLE"


def test_category_in_operator() -> None:
    rule = RuleSpec(
        rule_key="cat",
        kind="category",
        label="Reserved",
        ast_json={"op": "in", "field": "category", "value": ["SC", "ST"]},
    )
    assert evaluate_rule(rule, _profile(category="SC")).verdict == "pass"
    assert evaluate_rule(rule, _profile(category="GEN")).verdict == "fail"


def test_not_flips_pass_and_fail() -> None:
    rule = RuleSpec(
        rule_key="not_male",
        kind="gender",
        label="Not male",
        ast_json={"op": "not", "child": {"op": "eq", "field": "gender", "value": "male"}},
    )
    assert evaluate_rule(rule, _profile(gender="female")).verdict == "pass"
    assert evaluate_rule(rule, _profile(gender="male")).verdict == "fail"


def test_refold_fail_dominates() -> None:
    from app.services.eligibility.engine import EvaluatedRule, refold_evaluation

    folded = refold_evaluation(
        "x",
        [
            EvaluatedRule("a", "A", "", "pass", "ok"),
            EvaluatedRule("b", "B", "", "fail", "no"),
        ],
    )
    assert folded.status == "INELIGIBLE"
