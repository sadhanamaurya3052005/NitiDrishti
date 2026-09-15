"""Deterministic eligibility — AST only, never an LLM vote."""

from app.services.eligibility.engine import (
    EligibilityProfile,
    EvaluatedRule,
    RuleSpec,
    SchemeEvaluation,
    evaluate_rule,
    evaluate_scheme_rules,
)
from app.services.eligibility.service import EligibilityService

__all__ = [
    "EligibilityProfile",
    "EligibilityService",
    "EvaluatedRule",
    "RuleSpec",
    "SchemeEvaluation",
    "evaluate_rule",
    "evaluate_scheme_rules",
]
