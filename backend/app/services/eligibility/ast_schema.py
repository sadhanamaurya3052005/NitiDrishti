"""Validate gazette AST JSON before it is stored or evaluated."""

from __future__ import annotations

from typing import Any

_COMPARE_OPS = frozenset({"eq", "neq", "gt", "gte", "lt", "lte", "in"})
_LOGIC_OPS = frozenset({"and", "or", "not", "always"})
_FIELDS = frozenset({"age", "income", "land", "land_hectares", "gender", "category", "occupation"})


def validate_ast(node: Any, *, depth: int = 0) -> list[str]:
    """Return human-readable errors. Empty list means the tree is executable."""
    if depth > 12:
        return ["AST nesting exceeds 12 levels"]
    if not isinstance(node, dict):
        return ["AST node must be an object"]
    op = str(node.get("op") or "").lower()
    if not op:
        return []
    if op not in _COMPARE_OPS | _LOGIC_OPS:
        return [f"Unsupported AST op: {op}"]
    errors: list[str] = []
    if op in _LOGIC_OPS:
        if op == "always":
            return []
        if op == "not":
            child = node.get("child") or (node.get("children") or [None])[0]
            if child is None:
                errors.append("not requires a child")
            else:
                errors.extend(validate_ast(child, depth=depth + 1))
            return errors
        children = node.get("children")
        if not isinstance(children, list) or len(children) < 2:
            errors.append(f"{op} requires at least two children")
            return errors
        for child in children:
            errors.extend(validate_ast(child, depth=depth + 1))
        return errors
    field = str(node.get("field") or "").lower()
    if field not in _FIELDS:
        errors.append(f"Unsupported AST field: {field or 'missing'}")
    if op == "in" and not isinstance(node.get("value"), list):
        errors.append("in requires a list value")
    elif op != "in" and "value" not in node:
        errors.append(f"{op} requires a value")
    return errors
