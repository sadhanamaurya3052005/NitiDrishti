"""Machine-readable scheme lineage from existing FKs. No secrets."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import NotFoundError
from app.models.ingestion import Source, SourceDocument
from app.models.schemes import EligibilityRule, Scheme, SchemeVersion

PARSER_VERSION = "parse-v1"
EXTRACTION_VERSION = "extract-v1"


def scheme_lineage(session: Session, scheme_id: str) -> dict[str, Any]:
    scheme = _resolve_scheme(session, scheme_id)
    if scheme is None or scheme.current_version_id is None:
        raise NotFoundError(f"Scheme not found or unpublished pointer missing: {scheme_id}")
    version = session.scalar(
        select(SchemeVersion)
        .options(selectinload(SchemeVersion.rules))
        .where(SchemeVersion.id == scheme.current_version_id)
    )
    if version is None:
        raise NotFoundError(f"Current version missing for scheme: {scheme_id}")

    document: SourceDocument | None = None
    source: Source | None = None
    if version.source_document_id is not None:
        document = session.get(SourceDocument, version.source_document_id)
        if document is not None:
            source = session.get(Source, document.source_id)

    governance = version.governance if isinstance(version.governance, dict) else {}
    rules = list(version.rules or [])
    return {
        "scheme_id": str(scheme.id),
        "scheme_slug": scheme.slug,
        "scheme_status": scheme.status,
        "scheme_version": {
            "id": str(version.id),
            "version_number": version.version_number,
            "name": version.name,
        },
        "source_document_id": None if document is None else str(document.id),
        "source_id": None if source is None else str(source.id),
        "source_url": version.source_url,
        "registry_url": None if source is None else source.source_url,
        "retrieved_at": version.retrieved_at.isoformat() if version.retrieved_at else None,
        "content_hash": None if document is None else document.content_hash,
        "storage_path": None if document is None else document.storage_path,
        "parser_version": PARSER_VERSION,
        "extraction_version": EXTRACTION_VERSION,
        "rule_version": f"rules-v{version.version_number}",
        "rule_count": len(rules),
        "rule_validation_status": governance.get("rule_validation_status")
        or _rules_status(rules),
        "extraction_confidence": governance.get("extraction_confidence"),
        "dq": {
            "score": governance.get("score"),
            "version": governance.get("version"),
            "calculated_at": governance.get("calculated_at"),
        },
        "freshness_status": governance.get("freshness_status"),
        "change_class": governance.get("change_class"),
        "publication_state": scheme.status,
    }


def _rules_status(rules: list[EligibilityRule]) -> str:
    from app.services.eligibility.ast_schema import validate_ast

    if not rules:
        return "INVALID"
    for rule in rules:
        if validate_ast(rule.ast_json if isinstance(rule.ast_json, dict) else {}):
            return "INVALID"
    return "VALID"


def _resolve_scheme(session: Session, scheme_id: str) -> Scheme | None:
    try:
        uid = UUID(scheme_id)
    except ValueError:
        uid = None
    if uid is not None:
        row = session.get(Scheme, uid)
        if row is not None:
            return row
    return session.scalar(select(Scheme).where(Scheme.slug == scheme_id))
