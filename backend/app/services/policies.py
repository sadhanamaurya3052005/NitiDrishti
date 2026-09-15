"""Nyay-Mitra reads. Clause text is whatever was ingested — never invented."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.policy import Policy, PolicyChange, PolicyClause, PolicyVersion
from app.repositories.policies import (
    PolicyChangeRepository,
    PolicyClauseRepository,
    PolicyRepository,
    PolicyVersionRepository,
)
from app.services.ingestion.policy_diff import diff_clauses


class PolicyCatalogService:
    def __init__(self, session: Session) -> None:
        self.policies = PolicyRepository(session)
        self.versions = PolicyVersionRepository(session)
        self.clauses = PolicyClauseRepository(session)
        self.changes = PolicyChangeRepository(session)

    def list_policies(self, *, q: str | None = None) -> list[dict]:
        return [_policy(row, current=self._current(row)) for row in self.policies.list_all(q=q)]

    def get_policy(self, policy_id: str) -> dict:
        policy = self._require(policy_id)
        current = self._current(policy)
        versions = [_version(item, is_current=item.id == policy.current_version_id) for item in self.versions.for_policy(policy.id)]
        clauses = [] if current is None else [_clause(item) for item in self.clauses.for_version(current.id)]
        payload = _policy(policy, current)
        payload["versions"] = versions
        payload["clauses"] = clauses
        return payload

    def list_versions(self, policy_id: str) -> list[dict]:
        policy = self._require(policy_id)
        return [_version(item, is_current=item.id == policy.current_version_id) for item in self.versions.for_policy(policy.id)]

    def list_clauses(self, policy_id: str, version_id: str) -> list[dict]:
        policy = self._require(policy_id)
        version = self._require_version(policy.id, version_id)
        return [_clause(item) for item in self.clauses.for_version(version.id)]

    def list_changes(self, policy_id: str) -> list[dict]:
        policy = self._require(policy_id)
        versions = self.versions.for_policy(policy.id)
        if len(versions) < 2:
            return []
        newest, previous = versions[0], versions[1]
        stored = self.changes.between(previous.id, newest.id)
        if stored:
            return [_change(item) for item in stored]
        return diff_clauses(self.clauses.for_version(previous.id), self.clauses.for_version(newest.id))

    def compare(self, policy_id: str, *, from_version: str | None, to_version: str | None) -> dict:
        policy = self._require(policy_id)
        versions = self.versions.for_policy(policy.id)
        if not versions:
            raise NotFoundError("This policy has no ingested versions yet")
        if len(versions) < 2:
            current = versions[0]
            return {
                "policy_id": str(policy.id),
                "from_version": None,
                "to_version": _version(current, is_current=current.id == policy.current_version_id),
                "changes": [],
                "note": "Only one ingested version; no stored legal diff",
            }
        left = self._pick_version(policy.id, versions, from_version, default_index=min(1, len(versions) - 1))
        right = self._pick_version(policy.id, versions, to_version, default_index=0)
        if left.id == right.id:
            return {
                "policy_id": str(policy.id),
                "from_version": _version(left, is_current=left.id == policy.current_version_id),
                "to_version": _version(right, is_current=right.id == policy.current_version_id),
                "changes": [],
                "note": "from_version and to_version refer to the same row",
            }
        stored = self.changes.between(left.id, right.id)
        changes = (
            [_change(item) for item in stored]
            if stored
            else diff_clauses(self.clauses.for_version(left.id), self.clauses.for_version(right.id))
        )
        return {
            "policy_id": str(policy.id),
            "from_version": _version(left, is_current=left.id == policy.current_version_id),
            "to_version": _version(right, is_current=right.id == policy.current_version_id),
            "changes": changes,
        }

    def _require(self, policy_id: str) -> Policy:
        policy = self.policies.get_by_id_or_code(policy_id)
        if policy is None:
            raise NotFoundError(f"Policy not found: {policy_id}")
        return policy

    def _require_version(self, policy_id: UUID, version_id: str) -> PolicyVersion:
        try:
            uuid_value = UUID(version_id)
        except ValueError as exc:
            raise NotFoundError(f"Policy version not found: {version_id}") from exc
        version = self.versions.get_for_policy(policy_id, uuid_value)
        if version is None:
            raise NotFoundError(f"Policy version not found: {version_id}")
        return version

    def _pick_version(
        self,
        policy_id: UUID,
        versions: list[PolicyVersion],
        value: str | None,
        *,
        default_index: int,
    ) -> PolicyVersion:
        if value:
            return self._require_version(policy_id, value)
        return versions[default_index]

    def _current(self, policy: Policy) -> PolicyVersion | None:
        if policy.current_version_id is None:
            return None
        return self.versions.get(policy.current_version_id)


def _policy(row: Policy, current: PolicyVersion | None) -> dict:
    return {
        "id": str(row.id),
        "code": row.code,
        "title": row.title,
        "title_hi": row.title_hi,
        "issuing_body": row.issuing_body,
        "current_version_id": None if row.current_version_id is None else str(row.current_version_id),
        "source_url": None if current is None else current.source_url,
        "retrieved_at": None if current is None else current.retrieved_at.isoformat(),
        "gazette_ref": None if current is None else current.gazette_ref,
        "version_number": None if current is None else current.version_number,
    }


def _version(row: PolicyVersion, *, is_current: bool) -> dict:
    return {
        "id": str(row.id),
        "version_number": row.version_number,
        "gazette_ref": row.gazette_ref,
        "source_url": row.source_url,
        "retrieved_at": row.retrieved_at.isoformat(),
        "effective_from": None if row.effective_from is None else row.effective_from.isoformat(),
        "effective_to": None if row.effective_to is None else row.effective_to.isoformat(),
        "is_current": is_current,
    }


def _clause(row: PolicyClause) -> dict:
    return {
        "id": str(row.id),
        "clause_ref": row.clause_ref,
        "text": row.text,
        "page_no": row.page_no,
        "sort_order": row.sort_order,
    }


def _change(row: PolicyChange) -> dict:
    return {
        "id": str(row.id),
        "from_version_id": str(row.from_version_id),
        "to_version_id": str(row.to_version_id),
        "change_kind": row.change_kind,
        "clause_ref": row.clause_ref,
        "summary": row.summary,
        "numeric_old": row.numeric_old,
        "numeric_new": row.numeric_new,
    }
