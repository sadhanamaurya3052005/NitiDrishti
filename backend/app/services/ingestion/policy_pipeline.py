"""Fetch official policy/gazette pages and write immutable versions. Caller commits."""

from __future__ import annotations

import json
import time

from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import AppError
from app.core.logging import get_logger
from app.models.policy import Policy, PolicyChange, PolicyClause, PolicyVersion
from app.repositories.ingestion import (
    IngestionLogRepository,
    SourceDocumentRepository,
    SourceRepository,
)
from app.repositories.policies import (
    PolicyChangeRepository,
    PolicyClauseRepository,
    PolicyRepository,
    PolicyVersionRepository,
)
from app.services.ingestion.base import retrieve
from app.services.ingestion.factory import connector_for
from app.services.ingestion.http import RetrieveFn
from app.services.ingestion.payload import IngestResult, NormalizedPolicy, SourceSpec
from app.services.ingestion.policy_diff import diff_clauses
from app.services.ingestion.policy_extract import extract_policy
from app.services.ingestion.policy_registry import POLICY_SOURCES
from app.services.ingestion.snapshot import persist_snapshot
from app.services.ingestion.versioning import SchemeWriteRepository
from app.services.ingestion.whitelist import hostname_of

log = get_logger("nitidrishti.ingestion.policies")


class PolicyIngestionService:
    def __init__(self, session: Session, retrieve_fn: RetrieveFn = retrieve) -> None:
        self.session = session
        self.retrieve_fn = retrieve_fn
        self.sources = SourceRepository(session)
        self.documents = SourceDocumentRepository(session)
        self.logs = IngestionLogRepository(session)
        self.policies = PolicyRepository(session)
        self.versions = PolicyVersionRepository(session)
        self.clauses = PolicyClauseRepository(session)
        self.changes = PolicyChangeRepository(session)
        self.departments = SchemeWriteRepository(session)

    def ingest_registry(self, specs: tuple[SourceSpec, ...] | None = None) -> list[IngestResult]:
        results: list[IngestResult] = []
        for spec in specs or POLICY_SOURCES:
            results.append(self.ingest_source(spec))
            time.sleep(max(0.0, settings.ingestion_crawl_delay_seconds))
        return results

    def ingest_source(self, spec: SourceSpec) -> IngestResult:
        domain = hostname_of(spec.url)
        source = self.sources.upsert(
            name=spec.name,
            url=spec.url,
            domain=domain,
            connector_type=spec.connector_type,
            department_id=self.departments.get_department_id(spec.department_code),
        )
        log_row = self.logs.start(source.id)
        try:
            payload = connector_for(spec.connector_type, self.retrieve_fn).fetch(spec.url)
            storage_path = persist_snapshot(str(source.id), payload)
            existing = self.documents.get_by_hash(source.id, payload.content_hash)
            if existing is None:
                document = self.documents.add_document(
                    source_id=source.id,
                    uri=payload.final_url,
                    content_hash=payload.content_hash,
                    mime_type=payload.mime_type,
                    byte_size=len(payload.content),
                    storage_path=storage_path,
                    retrieved_at=payload.retrieved_at,
                )
            else:
                document = existing

            parsed = connector_for(spec.connector_type, self.retrieve_fn).parse(payload)
            item = extract_policy(parsed, spec)
            rows = 0
            created = 0
            if item is not None:
                created = 1 if self._apply(item, document.id, payload.retrieved_at) else 0
                rows = 1

            self.sources.mark_checked(source)
            self.logs.finish(
                log_row,
                status="ok",
                http_status=payload.status_code,
                rows_upserted=rows,
                content_hash=payload.content_hash,
                detail=json.dumps(
                    {
                        "document": "existing" if existing is not None else "new",
                        "document_id": str(document.id),
                        "versions_created": created,
                    }
                ),
            )
            return IngestResult(
                source_url=spec.url,
                status="ok",
                http_status=payload.status_code,
                rows_upserted=rows,
                versions_created=created,
                unchanged=item is None or created == 0,
                content_hash=payload.content_hash,
            )
        except AppError as exc:
            self.logs.finish(log_row, status="failed", error_code=exc.code, detail=exc.message)
            log.warning("policy_ingest_failed", url=spec.url, error_code=exc.code)
            return IngestResult(source_url=spec.url, status="failed", error_code=exc.code, detail=exc.message)
        except Exception as exc:
            self.logs.finish(log_row, status="failed", error_code="INTERNAL_ERROR", detail=type(exc).__name__)
            log.warning("policy_ingest_failed", url=spec.url, error_type=type(exc).__name__)
            return IngestResult(
                source_url=spec.url,
                status="failed",
                error_code="INTERNAL_ERROR",
                detail=type(exc).__name__,
            )

    def _apply(self, item: NormalizedPolicy, document_id, retrieved_at) -> bool:
        policy = self.policies.get_by_code(item.code)
        if policy is None:
            policy = Policy(
                code=item.code,
                title=item.title,
                title_hi=item.title_hi,
                issuing_body=item.issuing_body,
            )
            self.policies.add(policy)
            self.session.flush()
        else:
            policy.title = item.title
            policy.title_hi = item.title_hi
            policy.issuing_body = item.issuing_body

        current = None if policy.current_version_id is None else self.versions.get(policy.current_version_id)
        if current is not None:
            current_clauses = self.clauses.for_version(current.id)
            current_hash = _policy_fingerprint(
                policy.code, policy.title, current.source_url, current_clauses
            )
            if current_hash == item.content_hash:
                return False

        next_number = self.versions.max_version_number(policy.id) + 1
        version = PolicyVersion(
            policy_id=policy.id,
            version_number=next_number,
            gazette_ref=item.gazette_ref,
            source_url=item.source_url,
            source_document_id=document_id,
            retrieved_at=retrieved_at,
        )
        self.versions.add(version)
        self.session.flush()
        for clause in item.clauses:
            self.clauses.add(
                PolicyClause(
                    policy_version_id=version.id,
                    clause_ref=clause.clause_ref,
                    text=clause.text,
                    page_no=clause.page_no,
                    sort_order=clause.sort_order,
                )
            )
        self.session.flush()
        if current is not None:
            live = diff_clauses(self.clauses.for_version(current.id), self.clauses.for_version(version.id))
            for change in live:
                self.changes.add(
                    PolicyChange(
                        from_version_id=current.id,
                        to_version_id=version.id,
                        change_kind=change["change_kind"],
                        clause_ref=change["clause_ref"],
                        summary=change["summary"],
                        numeric_old=change["numeric_old"],
                        numeric_new=change["numeric_new"],
                    )
                )
        policy.current_version_id = version.id
        self.session.flush()
        return True


def _policy_fingerprint(code: str, title: str, source_url: str, clauses: list[PolicyClause]) -> str:
    from app.services.ingestion.hashing import sha256_text

    blob = (
        f"{code}|{title}|{source_url}|"
        + "|".join(f"{item.clause_ref}:{item.text}" for item in clauses)
    )
    return sha256_text(blob)
