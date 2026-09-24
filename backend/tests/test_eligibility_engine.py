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


def _or_age_or_category() -> RuleSpec:
    return RuleSpec(
        rule_key="alt",
        kind="age",
        label="Age or reserved category",
        ast_json={
            "op": "or",
            "children": [
                {"op": "gte", "field": "age", "value": 18},
                {"op": "eq", "field": "category", "value": "SC"},
            ],
        },
    )


def test_ast_or_pass_dominates() -> None:
    rule = _or_age_or_category()
    assert evaluate_rule(rule, _profile(age=22, category="GEN")).verdict == "pass"
    assert evaluate_rule(rule, _profile(age=12, category="SC")).verdict == "pass"
    assert evaluate_rule(rule, _profile(age=22, category=None)).verdict == "pass"


def test_ast_or_unknown_when_no_pass() -> None:
    rule = _or_age_or_category()
    assert evaluate_rule(rule, _profile(age=12, category=None)).verdict == "unknown"
    assert evaluate_rule(rule, _profile(age=None, category="GEN")).verdict == "unknown"
    assert evaluate_rule(rule, _profile(age=None, category=None)).verdict == "unknown"


def test_ast_or_all_fail() -> None:
    rule = _or_age_or_category()
    failed = evaluate_rule(rule, _profile(age=12, category="GEN"))
    assert failed.verdict == "fail"
    assert " or " in failed.explanation


def test_ast_or_does_not_mutate_unrelated_rule() -> None:
    or_rule = _or_age_or_category()
    other = RuleSpec(
        rule_key="income",
        kind="income",
        label="Income cap",
        ast_json={"op": "lte", "field": "income", "value": 100000},
        income_limit=100000,
    )
    or_children = or_rule.ast_json["children"]
    other_ast = other.ast_json
    lone = evaluate_rule(other, _profile(income=50000))

    together = evaluate_scheme_rules(
        "combo",
        [or_rule, other],
        _profile(age=22, category="GEN", income=50000),
    )

    assert or_rule.ast_json["children"] is or_children
    assert or_children == [
        {"op": "gte", "field": "age", "value": 18},
        {"op": "eq", "field": "category", "value": "SC"},
    ]
    assert other.ast_json is other_ast
    assert other.ast_json == {"op": "lte", "field": "income", "value": 100000}
    assert other.income_limit == 100000
    assert together.rules[1].id == "income"
    assert together.rules[1].verdict == lone.verdict
    assert together.rules[1].explanation == lone.explanation
    assert evaluate_rule(other, _profile(income=50000)).verdict == lone.verdict


def test_ast_or_nested() -> None:
    rule = RuleSpec(
        rule_key="nested",
        kind="age",
        label="Senior or reserved or income",
        ast_json={
            "op": "or",
            "children": [
                {
                    "op": "or",
                    "children": [
                        {"op": "gte", "field": "age", "value": 60},
                        {"op": "eq", "field": "category", "value": "SC"},
                    ],
                },
                {"op": "lte", "field": "income", "value": 100000},
            ],
        },
    )
    assert evaluate_rule(rule, _profile(age=65, category="GEN", income=200000)).verdict == "pass"
    assert evaluate_rule(rule, _profile(age=30, category="SC", income=200000)).verdict == "pass"
    assert evaluate_rule(rule, _profile(age=30, category="GEN", income=80000)).verdict == "pass"
    assert evaluate_rule(rule, _profile(age=30, category="GEN", income=None)).verdict == "unknown"
    assert evaluate_rule(rule, _profile(age=30, category="GEN", income=200000)).verdict == "fail"


def test_ast_or_scheme_score_and_status() -> None:
    or_rule = _or_age_or_category()
    always = RuleSpec(rule_key="exclusion", kind="always", label="Source exclusion")

    eligible = evaluate_scheme_rules("alt-scheme", [or_rule], _profile(age=22, category="GEN"))
    assert eligible.status == "ELIGIBLE"
    assert eligible.score == 100
    assert eligible.rules[0].verdict == "pass"

    partial = evaluate_scheme_rules("alt-scheme", [or_rule, always], _profile(age=22, category="GEN"))
    assert partial.status == "PARTIAL_INFO"
    assert partial.score == 50
    assert [item.verdict for item in partial.rules] == ["pass", "unknown"]

    unknown = evaluate_scheme_rules("alt-scheme", [or_rule], _profile(age=12, category=None))
    assert unknown.status == "PARTIAL_INFO"
    assert unknown.score == 0
    assert unknown.rules[0].verdict == "unknown"

    ineligible = evaluate_scheme_rules("alt-scheme", [or_rule], _profile(age=12, category="GEN"))
    assert ineligible.status == "INELIGIBLE"
    assert ineligible.score == 0
    assert ineligible.rules[0].verdict == "fail"
