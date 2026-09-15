"""Server role x workspace matrix.

Frozen in docs/api-contracts.md. Future feature routes should call
`require_roles(...)` or `require_workspace(...)` rather than copying this map.
"""

from __future__ import annotations

from collections.abc import Iterable

from app.core.exceptions import ForbiddenError

# Matches the role × workspace table in docs/api-contracts.md.
WORKSPACE_ROLES: dict[str, frozenset[str]] = {
    "citizen": frozenset({"CITIZEN", "STUDENT", "CSC_OPERATOR", "ADMIN"}),
    "csc": frozenset({"CSC_OPERATOR", "ADMIN"}),
    "nyay-mitra": frozenset({"WELFARE_OFFICER", "POLICY_ANALYST", "ADMIN"}),
    "welfare": frozenset({"WELFARE_OFFICER", "ADMIN"}),
    "analytics": frozenset({"WELFARE_OFFICER", "POLICY_ANALYST", "ADMIN"}),
}

ROLE_PRECEDENCE = (
    "ADMIN",
    "WELFARE_OFFICER",
    "POLICY_ANALYST",
    "CSC_OPERATOR",
    "STUDENT",
    "CITIZEN",
)


def preferred_role(roles: Iterable[str]) -> str:
    owned = set(roles)
    for code in ROLE_PRECEDENCE:
        if code in owned:
            return code
    return "CITIZEN"


def has_any_role(owned: Iterable[str], required: Iterable[str]) -> bool:
    owned_set = set(owned)
    if "ADMIN" in owned_set:
        return True
    return bool(owned_set.intersection(required))


def assert_roles(owned: Iterable[str], *required: str) -> None:
    if not has_any_role(owned, required):
        raise ForbiddenError("Insufficient role for this resource")


def assert_workspace(owned: Iterable[str], workspace: str) -> None:
    allowed = WORKSPACE_ROLES.get(workspace)
    if allowed is None:
        raise ForbiddenError("Unknown workspace")
    if not has_any_role(owned, allowed):
        raise ForbiddenError("Insufficient role for this workspace")
