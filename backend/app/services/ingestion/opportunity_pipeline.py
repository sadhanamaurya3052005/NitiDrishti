"""Fetch official HTML and write gazette opportunity rows. Caller commits."""

from __future__ import annotations

import json
import time
from datetime import UTC, datetime
from urllib.parse import urljoin
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import AppError
from app.core.logging import get_logger
from app.models.opportunities import Internship, Job, Scholarship
from app.repositories.ingestion import (
    IngestionLogRepository,
    SourceDocumentRepository,
    SourceRepository,
)
from app.repositories.opportunities import (
    InternshipRepository,
    JobRepository,
    ScholarshipRepository,
)
from app.services.ingestion.base import retrieve
from app.services.ingestion.factory import connector_for
from app.services.ingestion.http import RetrieveFn
from app.services.ingestion.opportunity_extract import (
    extract_opportunity,
    extract_opportunity_listing_urls,
)
from app.services.ingestion.opportunity_registry import (
    OPPORTUNITY_MAX_DISCOVERED,
    OPPORTUNITY_SOURCES,
)
from app.services.ingestion.payload import IngestResult, NormalizedOpportunity, SourceSpec
from app.services.ingestion.snapshot import persist_snapshot
from app.services.ingestion.versioning import SchemeWriteRepository
from app.services.ingestion.whitelist import assert_whitelisted, hostname_of

log = get_logger("nitidrishti.ingestion.opportunities")


class OpportunityIngestionService:
    def __init__(self, session: Session, retrieve_fn: RetrieveFn = retrieve) -> None:
        self.session = session
        self.retrieve_fn = retrieve_fn
        self.sources = SourceRepository(session)
        self.documents = SourceDocumentRepository(session)
        self.logs = IngestionLogRepository(session)
        self.jobs = JobRepository(session)
        self.internships = InternshipRepository(session)
        self.scholarships = ScholarshipRepository(session)
        self.departments = SchemeWriteRepository(session)

    def ingest_registry(self, specs: tuple[SourceSpec, ...] | None = None) -> list[IngestResult]:
        results: list[IngestResult] = []
        discovered: list[SourceSpec] = []
        registry = specs or OPPORTUNITY_SOURCES
        for spec in registry:
            result = self.ingest_source(spec)
            results.append(result)
            time.sleep(max(0.0, settings.ingestion_crawl_delay_seconds))
            if spec.is_listing and result.child_urls:
                for url in result.child_urls[:OPPORTUNITY_MAX_DISCOVERED]:
                    connector = "pdf" if url.lower().split("?", 1)[0].endswith(".pdf") else "html"
                    discovered.append(
                        SourceSpec(
                            name=url.rsplit("/", 1)[-1] or spec.name,
                            url=url,
                            connector_type=connector,
                            opportunity_kind=spec.opportunity_kind,
                            department_code=spec.department_code,
                        )
                    )
        seen = {spec.url for spec in registry}
        for child in discovered:
            if child.url in seen:
                continue
            seen.add(child.url)
            results.append(self.ingest_source(child))
            time.sleep(max(0.0, settings.ingestion_crawl_delay_seconds))
        self._collapse_duplicate_titles()
        return results

    def ingest_source(self, spec: SourceSpec) -> IngestResult:
        domain = hostname_of(spec.url)
        department_id = self.departments.get_department_id(spec.department_code)
        source = self.sources.upsert(
            name=spec.name,
            url=spec.url,
            domain=domain,
            connector_type=spec.connector_type,
            department_id=department_id,
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
            child_urls = [
                urljoin(payload.final_url, url)
                for url in extract_opportunity_listing_urls(parsed, spec)
                if _safe_child(urljoin(payload.final_url, url))
            ]
            item = extract_opportunity(parsed, spec)
            rows = 0
            created = 0
            if item is not None:
                created = 1 if self._upsert(item, department_id, payload.retrieved_at) else 0
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
                        "kind": spec.opportunity_kind,
                        "document": "existing" if existing is not None else "new",
                        "document_id": str(document.id),
                        "children": len(child_urls),
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
                child_urls=child_urls,
            )
        except AppError as exc:
            self.logs.finish(log_row, status="failed", error_code=exc.code, detail=exc.message)
            log.warning("opportunity_ingest_failed", url=spec.url, error_code=exc.code)
            return IngestResult(source_url=spec.url, status="failed", error_code=exc.code, detail=exc.message)
        except Exception as exc:
            self.logs.finish(log_row, status="failed", error_code="INTERNAL_ERROR", detail=type(exc).__name__)
            log.warning("opportunity_ingest_failed", url=spec.url, error_type=type(exc).__name__)
            return IngestResult(
                source_url=spec.url,
                status="failed",
                error_code="INTERNAL_ERROR",
                detail=type(exc).__name__,
            )

    def _upsert(
        self,
        item: NormalizedOpportunity,
        department_id: UUID | None,
        retrieved_at: datetime,
    ) -> bool:
        if item.kind == "job":
            row: Job | Internship | Scholarship | None = (
                self.jobs.get_by_url(item.source_url)
                or self.jobs.get_by_hash(item.content_hash)
                or self.jobs.get_by_title(item.title)
            )
            if row is None:
                self.jobs.add(
                    Job(
                        title=item.title,
                        title_hi=item.title_hi,
                        department_id=department_id,
                        source_url=item.source_url,
                        content_hash=item.content_hash,
                        deadline=item.deadline,
                        status=item.status,
                        retrieved_at=retrieved_at,
                        summary=item.summary,
                    )
                )
                self.session.flush()
                return True
        elif item.kind == "internship":
            row = (
                self.internships.get_by_url(item.source_url)
                or self.internships.get_by_hash(item.content_hash)
                or self.internships.get_by_title(item.title)
            )
            if row is None:
                self.internships.add(
                    Internship(
                        title=item.title,
                        title_hi=item.title_hi,
                        department_id=department_id,
                        source_url=item.source_url,
                        content_hash=item.content_hash,
                        deadline=item.deadline,
                        status=item.status,
                        retrieved_at=retrieved_at,
                        summary=item.summary,
                    )
                )
                self.session.flush()
                return True
        else:
            row = (
                self.scholarships.get_by_url(item.source_url)
                or self.scholarships.get_by_hash(item.content_hash)
                or self.scholarships.get_by_title(item.title)
            )
            if row is None:
                self.scholarships.add(
                    Scholarship(
                        title=item.title,
                        title_hi=item.title_hi,
                        department_id=department_id,
                        source_url=item.source_url,
                        content_hash=item.content_hash,
                        deadline=item.deadline,
                        income_limit=item.income_limit,
                        status=item.status,
                        retrieved_at=retrieved_at,
                        summary=item.summary,
                    )
                )
                self.session.flush()
                return True

        if row.content_hash == item.content_hash:
            return False
        row.title = item.title
        row.title_hi = item.title_hi
        row.summary = item.summary
        row.content_hash = item.content_hash
        row.deadline = item.deadline
        row.status = item.status
        row.retrieved_at = retrieved_at or datetime.now(UTC)
        if department_id is not None:
            row.department_id = department_id
        if isinstance(row, Scholarship):
            row.income_limit = item.income_limit
        self.session.flush()
        return True

    def _collapse_duplicate_titles(self) -> None:
        junk = {
            "scholarship",
            "scholarships",
            "internship",
            "internships",
            "schemes",
            "ministry of railways (railway board)",
        }
        for model in (Job, Internship, Scholarship):
            rows = list(self.session.scalars(select(model).order_by(model.retrieved_at)).all())
            seen: set[str] = set()
            for row in rows:
                key = row.title.strip().lower()
                broken = "{{" in row.title or "filenotfound" in (row.source_url or "").lower()
                if key in junk or key in seen or broken:
                    self.session.delete(row)
                else:
                    seen.add(key)
        self.session.flush()


def _safe_child(url: str) -> bool:
    try:
        assert_whitelisted(url)
    except Exception:
        return False
    return True
