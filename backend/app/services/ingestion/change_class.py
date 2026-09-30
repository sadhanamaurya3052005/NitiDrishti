"""Heuristic content-change classification. Not an LLM. SHA-256 remains the identity gate."""

from __future__ import annotations

from app.models.schemes import SchemeVersion
from app.services.ingestion.dedup import detect_change_kind, scheme_fingerprint, version_fingerprint
from app.services.ingestion.payload import NormalizedScheme

# Pipeline-facing classes (distinct from policy_diff CHANGE_KINDS).
CHANGE_CLASSES = frozenset(
    {
        "NO_CHANGE",
        "MINOR_CHANGE",
        "MATERIAL_CHANGE",
        "STRUCTURAL_CHANGE",
        "UNKNOWN_CHANGE",
    }
)


def classify_scheme_change(previous: SchemeVersion | None, incoming: NormalizedScheme) -> str:
    """Map versioning diffs to change classes. Fingerprint equality ⇒ NO_CHANGE."""
    if previous is None:
        return "STRUCTURAL_CHANGE"
    if version_fingerprint(previous) == scheme_fingerprint(incoming):
        return "NO_CHANGE"
    kind = detect_change_kind(previous, incoming)
    if kind == "ELIGIBILITY_CHANGED":
        return "STRUCTURAL_CHANGE"
    if kind == "BENEFIT_CHANGED":
        return "MATERIAL_CHANGE"
    if kind == "UPDATED":
        # Name/summary text shifts without benefit/rule AST change.
        return "MINOR_CHANGE"
    if kind == "NEW":
        return "STRUCTURAL_CHANGE"
    return "UNKNOWN_CHANGE"


def change_requires_hitl(change_class: str) -> bool:
    return change_class in {"MATERIAL_CHANGE", "STRUCTURAL_CHANGE"}
