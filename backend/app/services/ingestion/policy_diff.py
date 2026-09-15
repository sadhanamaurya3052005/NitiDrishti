"""Deterministic clause diff. Uses ingested text only."""

from __future__ import annotations

import re

from app.models.policy import PolicyClause


def diff_clauses(old_rows: list[PolicyClause], new_rows: list[PolicyClause]) -> list[dict]:
    old_map = {row.clause_ref: row for row in old_rows}
    new_map = {row.clause_ref: row for row in new_rows}
    changes: list[dict] = []
    for ref in sorted(set(old_map) | set(new_map)):
        left = old_map.get(ref)
        right = new_map.get(ref)
        if left is None and right is not None:
            changes.append(
                _live("added", ref, f"Clause {ref} added: {_clip(right.text)}", None, None)
            )
        elif right is None and left is not None:
            changes.append(
                _live("removed", ref, f"Clause {ref} removed: {_clip(left.text)}", None, None)
            )
        elif left is not None and right is not None and _norm(left.text) != _norm(right.text):
            kind, old_n, new_n = _numeric_kind(left.text, right.text)
            changes.append(
                _live(
                    kind,
                    ref,
                    f"Clause {ref} {kind}: {_clip(left.text)} → {_clip(right.text)}",
                    old_n,
                    new_n,
                )
            )
    return changes


def _live(
    change_kind: str,
    clause_ref: str,
    summary: str,
    numeric_old: float | None,
    numeric_new: float | None,
) -> dict:
    return {
        "id": None,
        "from_version_id": None,
        "to_version_id": None,
        "change_kind": change_kind,
        "clause_ref": clause_ref,
        "summary": summary,
        "numeric_old": numeric_old,
        "numeric_new": numeric_new,
    }


def _norm(value: str) -> str:
    return " ".join(value.split()).strip().lower()


def _clip(value: str, width: int = 220) -> str:
    compact = " ".join(value.split())
    if len(compact) <= width:
        return compact
    return compact[: width - 1] + "…"


def _numeric_kind(old: str, new: str) -> tuple[str, float | None, float | None]:
    old_nums = _numbers(old)
    new_nums = _numbers(new)
    if len(old_nums) == 1 and len(new_nums) == 1 and old_nums[0] != new_nums[0]:
        return "numeric", old_nums[0], new_nums[0]
    return "amended", None, None


def _numbers(text: str) -> list[float]:
    found: list[float] = []
    for match in re.findall(r"\d+(?:\.\d+)?", text.replace(",", "")):
        try:
            found.append(float(match))
        except ValueError:
            continue
    return found[:4]
