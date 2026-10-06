"""Orchestrate fetch → snapshot → dedup → extract → version. Caller commits."""

from __future__ import annotations

import json
import time
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

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
from app.services.ingestion.contracts import assert_ast, assert_bronze, assert_silver
from app.services.ingestion.dq_score import compute_dq
from app.services.ingestion.extractors import extract_listing_urls, extract_schemes
from app.services.ingestion.factory import connector_for
from app.services.ingestion.failures import classify_app_error, classify_exception
from app.services.ingestion.health import apply_ingest_outcome
from app.services.ingestion.http import RetrieveFn
from app.services.ingestion.layers import PIPELINE_STAGES
from app.services.ingestion.payload import IngestResult, ParsedDocument, SourceSpec
from app.services.ingestion.quality import apply_quality
from app.services.ingestion.registry import FIRST_CRAWL_MAX_DISCOVERED, FIRST_CRAWL_SOURCES
from app.services.ingestion.snapshot import persist_snapshot
from app.services.ingestion.validate import validate_scheme
from app.services.ingestion.versioning import SchemeWriteRepository
from app.services.ingestion.whitelist import assert_whitelisted, hostname_of

log = get_logger("nitidrishti.ingestion")


def _vikaspedia_hindi_candidates(parsed: ParsedDocument, source_url: str) -> list[str]:
    """Find official Vikaspedia Hindi representations without inventing translations."""
    candidates: list[str] = []
    seen: set[str] = set()

    def add(url: str) -> None:
        if not url or url in seen:
            return
        parsed_url = urlparse(url)
        host = (parsed_url.hostname or "").lower()
        if host not in {"schemes.vikaspedia.in", "vikaspedia.in"}:
            return

        query = dict(parse_qsl(parsed_url.query, keep_blank_values=True))
        if query.get("lgn", "").lower() != "hi":
            return

        seen.add(url)
        candidates.append(url)

    for link in parsed.links:
        add(urljoin(source_url, link))

    source = urlparse(source_url)
    if (source.hostname or "").lower().endswith("vikaspedia.in"):
        query = dict(parse_qsl(source.query, keep_blank_values=True))
        query["lgn"] = "hi"
        hindi_url = urlunparse(
            (
                source.scheme or "https",
                "schemes.vikaspedia.in",
                source.path,
                source.params,
                urlencode(query),
                source.fragment,
            )
        )
        add(hindi_url)

    return candidates


def _extract_hindi_fields(parsed: ParsedDocument) -> tuple[str, str]:
    """Extract Hindi fields only from fetched Hindi official content."""
    try:
        from app.services.ingestion.extractors import (
            _clean_title,
            _first_paragraph,
            _meta_description,
            _next_data_fields,
        )

        page_bits = _next_data_fields(parsed.next_data)
        title = _clean_title(parsed.title) or _clean_title(page_bits.get("title"))
        summary = (
            _meta_description(parsed.html)
            or page_bits.get("description")
            or _first_paragraph(parsed.text)
        )

        title = (title or "").strip()
        summary = (summary or "").strip()

        devanagari = sum(
            1 for ch in f"{title} {summary}" if "\u0900" <= ch <= "\u097F"
        )

        if devanagari < 3:
            return "", ""

        return title[:300], summary[:2000]
    except Exception:
        return "", ""


def _enrich_hindi_scheme(
    scheme,
    parsed: ParsedDocument,
    spec: SourceSpec,
    retrieve_fn: RetrieveFn,
) -> None:
    """Best-effort official Hindi enrichment."""
    source_url = parsed.payload.final_url or spec.url

    if "vikaspedia.in" not in (urlparse(source_url).hostname or "").lower():
        return

    try:
        for hindi_url in _vikaspedia_hindi_candidates(parsed, source_url):
            try:
                hindi_payload = retrieve_fn(hindi_url)
                hindi_parsed = connector_for("html", retrieve_fn).parse(hindi_payload)
                hindi_name, hindi_summary = _extract_hindi_fields(hindi_parsed)

                if hindi_name:
                    scheme.name_hi = hindi_name
                if hindi_summary:
                    scheme.summary_hi = hindi_summary

                if hindi_name or hindi_summary:
                    log.info(
                        "Hindi enrichment succeeded",
                        extra={
                            "source_url": source_url,
                            "hindi_url": hindi_url,
                            "scheme": scheme.slug,
                        },
                    )
                    return

            except Exception as exc:
                log.warning(
                    "Hindi enrichment candidate failed",
                    extra={
                        "source_url": source_url,
                        "hindi_url": hindi_url,
                        "error": type(exc).__name__,
                    },
                )

    except Exception as exc:
        log.warning(
            "Hindi enrichment skipped",
            extra={
                "source_url": source_url,
                "scheme": getattr(scheme, "slug", ""),
                "error": type(exc).__name__,
            },
        )


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
        started = time.perf_counter()
        if not source.is_active:
            detail = json.dumps(
                {
                    "layer": "bronze",
                    "stage": "inactive_skip",
                    "note": "Source is_active=false; ingestion refused",
                }
            )
            failure = classify_app_error("SOURCE_INACTIVE", detail, stage="source_registry")
            log_row = self.logs.start(source.id)
            duration_ms = int((time.perf_counter() - started) * 1000)
            self.logs.finish(
                log_row,
                status="failed",
                error_code="SOURCE_INACTIVE",
                detail=detail,
                failure_class=failure.failure_class,
                retryable=failure.retryable,
                failure_stage=failure.failure_stage,
                duration_ms=duration_ms,
            )
            apply_ingest_outcome(
                source,
                success=False,
                error_code="SOURCE_INACTIVE",
                duration_ms=duration_ms,
            )
            return IngestResult(
                source_url=spec.url,
                status="failed",
                error_code="SOURCE_INACTIVE",
                detail=detail,
            )
        log_row = self.logs.start(source.id)
        try:
            payload = connector_for(spec.connector_type, self.retrieve_fn).fetch(spec.url)
            storage_path = persist_snapshot(str(source.id), payload)
            assert_bronze(payload, storage_path=storage_path)
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
                prior = self.logs.latest_finished_for_source(source.id)
                if (
                    prior is not None
                    and prior.status == "ok"
                    and prior.content_hash == payload.content_hash
                ):
                    duration_ms = int((time.perf_counter() - started) * 1000)
                    detail = json.dumps(
                        {
                            "layer": "bronze",
                            "stage": "dedup_skip",
                            "document": "existing",
                            "change_class": "NO_CHANGE",
                            "stages": list(PIPELINE_STAGES[:3]),
                        }
                    )
                    self.logs.finish(
                        log_row,
                        status="ok",
                        http_status=payload.status_code,
                        rows_upserted=0,
                        content_hash=payload.content_hash,
                        detail=detail,
                        duration_ms=duration_ms,
                    )
                    apply_ingest_outcome(
                        source,
                        success=True,
                        http_status=payload.status_code,
                        content_hash=payload.content_hash,
                        duration_ms=duration_ms,
                    )
                    return IngestResult(
                        source_url=spec.url,
                        status="ok",
                        http_status=payload.status_code,
                        rows_upserted=0,
                        versions_created=0,
                        unchanged=True,
                        content_hash=payload.content_hash,
                        detail=detail,
                    )

            parsed = connector_for(spec.connector_type, self.retrieve_fn).parse(payload)
            child_urls = [
                _absolutize(payload.final_url, url)
                for url in extract_listing_urls(parsed, spec)
            ]
            child_urls = [url for url in child_urls if _safe_child(url)]

            rows = 0
            versions = 0
            kinds: list[str] = []
            change_classes: list[str] = []
            for scheme in extract_schemes(parsed, spec):
                _enrich_hindi_scheme(
                    scheme,
                    parsed,
                    spec,
                    self.retrieve_fn,
                )
                apply_quality(scheme, retrieved_at=payload.retrieved_at)
                assert_silver(scheme)
                for rule in scheme.rules:
                    assert_ast(rule.ast_json)
                validate_scheme(scheme)
                dq = compute_dq(scheme, retrieved_at=payload.retrieved_at)
                governance = {
                    **dq.as_dict(),
                    # Extraction confidence is NOT eligibility confidence.
                    "extraction_confidence": float(scheme.confidence or 0.0),
                    "rule_validation_status": dq.rule_validation_status,
                }
                if dq.blocking:
                    scheme.status = "needs_review"
                _scheme, created, change_kind = self.writer.apply(
                    scheme,
                    document,
                    governance=governance,
                )
                rows += 1
                versions += created
                kinds.append(change_kind)
                change_classes.append((governance or {}).get("change_class") or "UNKNOWN_CHANGE")

            duration_ms = int((time.perf_counter() - started) * 1000)
            unchanged = existing is not None and versions == 0
            detail = json.dumps(
                {
                    "layer": "gold" if versions else "silver",
                    "versions_created": versions,
                    "changes": kinds,
                    "change_classes": change_classes,
                    "children": len(child_urls),
                    "document": "existing" if existing is not None else "new",
                    "stages": list(PIPELINE_STAGES),
                }
            )
            self.logs.finish(
                log_row,
                status="ok",
                http_status=payload.status_code,
                rows_upserted=rows,
                content_hash=payload.content_hash,
                detail=detail,
                duration_ms=duration_ms,
            )
            apply_ingest_outcome(
                source,
                success=True,
                http_status=payload.status_code,
                content_hash=payload.content_hash,
                duration_ms=duration_ms,
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
            duration_ms = int((time.perf_counter() - started) * 1000)
            failure = classify_app_error(exc.code, exc.message)
            self.logs.finish(
                log_row,
                status="failed",
                error_code=exc.code,
                detail=exc.message,
                failure_class=failure.failure_class,
                retryable=failure.retryable,
                failure_stage=failure.failure_stage,
                duration_ms=duration_ms,
            )
            apply_ingest_outcome(
                source,
                success=False,
                error_code=exc.code,
                duration_ms=duration_ms,
            )
            log.warning(
                "ingestion_failed",
                url=spec.url,
                error_code=exc.code,
                failure_class=failure.failure_class,
            )
            return IngestResult(
                source_url=spec.url,
                status="failed",
                error_code=exc.code,
                detail=exc.message,
            )
        except Exception as exc:
            duration_ms = int((time.perf_counter() - started) * 1000)
            failure = classify_exception(exc)
            self.logs.finish(
                log_row,
                status="failed",
                error_code="INTERNAL_ERROR",
                detail=type(exc).__name__,
                failure_class=failure.failure_class,
                retryable=failure.retryable,
                failure_stage=failure.failure_stage,
                duration_ms=duration_ms,
            )
            apply_ingest_outcome(
                source,
                success=False,
                error_code="INTERNAL_ERROR",
                duration_ms=duration_ms,
            )
            log.warning(
                "ingestion_failed",
                url=spec.url,
                error_type=type(exc).__name__,
                failure_class=failure.failure_class,
            )
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
