"""Orchestrate fetch → snapshot → dedup → extract → version. Caller commits."""

from __future__ import annotations

import json
import time
from urllib.parse import urljoin

from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import AppError
from app.core.logging import get_logger
from app.repositories.ingestion import (
    IngestionLogRepository,
    SourceDocumentRepository,
    SourceRepository,
)
from app.services.ingestion.base import retrieve
from app.services.ingestion.extractors import extract_listing_urls, extract_schemes
from app.services.ingestion.factory import connector_for
from app.services.ingestion.http import RetrieveFn
from app.services.ingestion.payload import IngestResult, SourceSpec
from app.services.ingestion.registry import FIRST_CRAWL_MAX_DISCOVERED, FIRST_CRAWL_SOURCES
from app.services.ingestion.snapshot import persist_snapshot
from app.services.ingestion.validate import validate_scheme
from app.services.ingestion.versioning import SchemeWriteRepository
from app.services.ingestion.whitelist import assert_whitelisted, hostname_of

log = get_logger("nitidrishti.ingestion")


class SchemeIngestionService:
    def __init__(self, session: Session, retrieve_fn: RetrieveFn = retrieve) -> None:
        self.session = session
        self.retrieve_fn = retrieve_fn
        self.sources = SourceRepository(session)
        self.documents = SourceDocumentRepository(session)
        self.logs = IngestionLogRepository(session)
        self.writer = SchemeWriteRepository(session)

    def ingest_registry(self, specs: tuple[SourceSpec, ...] | None = None) -> list[IngestResult]:
        results: list[IngestResult] = []
        discovered: list[SourceSpec] = []
        for spec in specs or FIRST_CRAWL_SOURCES:
            result = self.ingest_source(spec)
            results.append(result)
            time.sleep(max(0.0, settings.ingestion_crawl_delay_seconds))
            if spec.is_listing and result.child_urls:
                for url in result.child_urls[:FIRST_CRAWL_MAX_DISCOVERED]:
                    discovered.append(
                        SourceSpec(
                            name=url.rsplit("/", 1)[-1] or spec.name,
                            url=url,
                            connector_type="html",
                            category=spec.category,
                            department_code=spec.department_code,
                        )
                    )
        seen = {spec.url for spec in (specs or FIRST_CRAWL_SOURCES)}
        for child in discovered:
            if child.url in seen:
                continue
            seen.add(child.url)
            results.append(self.ingest_source(child))
            time.sleep(max(0.0, settings.ingestion_crawl_delay_seconds))
        return results

    def ingest_source(self, spec: SourceSpec) -> IngestResult:
        domain = hostname_of(spec.url)
        department_id = self.writer.get_department_id(spec.department_code)
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
                _absolutize(payload.final_url, url)
                for url in extract_listing_urls(parsed, spec)
            ]
            child_urls = [url for url in child_urls if _safe_child(url)]

            rows = 0
            versions = 0
            kinds: list[str] = []
            for scheme in extract_schemes(parsed, spec):
                validate_scheme(scheme)
                _scheme, created, change_kind = self.writer.apply(scheme, document)
                rows += 1
                versions += created
                kinds.append(change_kind)

            self.sources.mark_checked(source)
            unchanged = existing is not None and versions == 0
            detail = json.dumps(
                {
                    "versions_created": versions,
                    "changes": kinds,
                    "children": len(child_urls),
                    "document": "existing" if existing is not None else "new",
                }
            )
            self.logs.finish(
                log_row,
                status="ok",
                http_status=payload.status_code,
                rows_upserted=rows,
                content_hash=payload.content_hash,
                detail=detail,
            )
            return IngestResult(
                source_url=spec.url,
                status="ok",
                http_status=payload.status_code,
                rows_upserted=rows,
                versions_created=versions,
                unchanged=unchanged,
                content_hash=payload.content_hash,
                detail=detail,
                child_urls=child_urls,
            )
        except AppError as exc:
            self.logs.finish(
                log_row,
                status="failed",
                error_code=exc.code,
                detail=exc.message,
            )
            log.warning("ingestion_failed", url=spec.url, error_code=exc.code)
            return IngestResult(
                source_url=spec.url,
                status="failed",
                error_code=exc.code,
                detail=exc.message,
            )
        except Exception as exc:
            self.logs.finish(
                log_row,
                status="failed",
                error_code="INTERNAL_ERROR",
                detail=type(exc).__name__,
            )
            log.warning("ingestion_failed", url=spec.url, error_type=type(exc).__name__)
            return IngestResult(
                source_url=spec.url,
                status="failed",
                error_code="INTERNAL_ERROR",
                detail=type(exc).__name__,
            )


def _absolutize(base: str, url: str) -> str:
    return urljoin(base, url)


def _safe_child(url: str) -> bool:
    try:
        assert_whitelisted(url)
    except Exception:
        return False
    return True
