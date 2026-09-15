"""Background batch refresh of official sources.

This is a scheduled crawl, not a live government feed. Tests must not start it.
Respects robots.txt (fail-closed) and INGESTION crawl delay inside each pipeline.
"""

from __future__ import annotations

import os
import sys
from collections import Counter
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.schedulers.blocking import BlockingScheduler
from sqlalchemy.orm import Session

from app.config import settings
from app.core.database import SessionLocal
from app.core.logging import get_logger
from app.repositories.ingestion import IngestionLogRepository, SourceRepository
from app.services.ingestion.opportunity_pipeline import OpportunityIngestionService
from app.services.ingestion.pipeline import SchemeIngestionService
from app.services.ingestion.policy_pipeline import PolicyIngestionService

log = get_logger("nitidrishti.ingestion.scheduler")

STARTUP_GRACE_SECONDS = 60


def _in_test_process() -> bool:
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return True
    if os.environ.get("APP_ENV", "").lower() == "testing":
        return True
    if settings.app_env == "testing":
        return True
    return "pytest" in sys.modules


def scheduler_should_run() -> bool:
    """Never crawl from pytest or APP_ENV=testing, even if the env flag is on."""
    if _in_test_process():
        return False
    if settings.app_env == "testing":
        return False
    return bool(settings.ingest_scheduler_enabled)


def ingest_interval_hours() -> int:
    try:
        hours = int(settings.ingest_interval_hours)
    except (TypeError, ValueError):
        hours = 24
    return max(1, hours)


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def latest_catalog_activity(session: Session) -> datetime | None:
    log_at = IngestionLogRepository(session).latest_started_at()
    source_at = SourceRepository(session).latest_checked_at()
    times = [_aware(item) for item in (log_at, source_at) if item is not None]
    if not times:
        return None
    return max(times)


def refresh_too_recent(session: Session, *, now: datetime | None = None) -> bool:
    last = latest_catalog_activity(session)
    if last is None:
        return False
    current = _aware(now or datetime.now(UTC))
    return (current - last) < timedelta(hours=ingest_interval_hours())


def first_job_time(*, now: datetime | None = None, last: datetime | None = None) -> datetime:
    """If a crawl just happened, wait the remaining interval. Empty catalogue waits a full interval."""
    current = _aware(now or datetime.now(UTC))
    hours = ingest_interval_hours()
    if last is None:
        return current + timedelta(hours=hours)
    due = _aware(last) + timedelta(hours=hours)
    grace = current + timedelta(seconds=STARTUP_GRACE_SECONDS)
    return due if due > grace else grace


def run_scheduled_refresh(session_factory: Callable[[], Session] = SessionLocal) -> dict[str, Any]:
    """One batch pass over scheme, policy, and opportunity registries. Caller does not need to commit."""
    os.environ.pop("CURL_CA_BUNDLE", None)
    session = session_factory()
    summary: dict[str, Any] = {
        "mode": "batch_refresh",
        "live_feed": False,
        "skipped": False,
        "schemes": {},
        "policies": {},
        "opportunities": {},
    }
    try:
        if refresh_too_recent(session):
            summary["skipped"] = True
            log.info(
                "scheduled_refresh_skipped",
                reason="within_interval",
                interval_hours=ingest_interval_hours(),
                note="A crawl already ran inside INGEST_INTERVAL_HOURS.",
            )
            return summary
        log.info(
            "scheduled_refresh_start",
            note="Batch refresh of official sources; not a live government feed.",
        )
        scheme_results = SchemeIngestionService(session).ingest_registry()
        policy_results = PolicyIngestionService(session).ingest_registry()
        opportunity_results = OpportunityIngestionService(session).ingest_registry()
        session.commit()
        summary["schemes"] = dict(Counter(item.status for item in scheme_results))
        summary["policies"] = dict(Counter(item.status for item in policy_results))
        summary["opportunities"] = dict(Counter(item.status for item in opportunity_results))
        log.info("scheduled_refresh_ok", **summary)
        return summary
    except Exception:
        session.rollback()
        log.exception("scheduled_refresh_failed")
        raise
    finally:
        session.close()


def _resolve_first_run() -> datetime:
    session = SessionLocal()
    try:
        last = latest_catalog_activity(session)
    except Exception:
        log.warning("ingest_scheduler_last_run_unreadable", note="Waiting a full interval before first crawl.")
        return datetime.now(UTC) + timedelta(hours=ingest_interval_hours())
    finally:
        session.close()
    return first_job_time(last=last)


def start_background_scheduler() -> BackgroundScheduler | None:
    if not scheduler_should_run():
        log.info(
            "ingest_scheduler_idle",
            enabled=settings.ingest_scheduler_enabled,
            app_env=settings.app_env,
            note="Batch refresh is off in this process (pytest / APP_ENV=testing, or flag false).",
        )
        return None
    hours = ingest_interval_hours()
    scheduler = BackgroundScheduler(timezone="UTC")
    first = _resolve_first_run()
    scheduler.add_job(
        run_scheduled_refresh,
        "interval",
        hours=hours,
        id="official_catalog_refresh",
        replace_existing=True,
        next_run_time=first,
        coalesce=True,
        max_instances=1,
    )
    scheduler.start()
    log.info(
        "ingest_scheduler_started",
        interval_hours=hours,
        first_run_at=first.isoformat(),
        note="Batch refresh, not a live government feed. robots.txt fail-closed; crawl delay between sources.",
    )
    return scheduler


def stop_background_scheduler(scheduler: BackgroundScheduler | None) -> None:
    if scheduler is None or not scheduler.running:
        return
    scheduler.shutdown(wait=False)
    log.info("ingest_scheduler_stopped")


def run_blocking_scheduler(*, run_immediately: bool = True) -> None:
    """Native process entry: optional first pass, then interval jobs. Ctrl+C to stop."""
    os.environ.pop("CURL_CA_BUNDLE", None)
    hours = ingest_interval_hours()
    log.info(
        "ingest_scheduler_blocking",
        interval_hours=hours,
        run_immediately=run_immediately,
        note="Batch refresh, not a live government feed.",
    )
    if run_immediately:
        run_scheduled_refresh()
    scheduler = BlockingScheduler(timezone="UTC")
    scheduler.add_job(
        run_scheduled_refresh,
        "interval",
        hours=hours,
        id="official_catalog_refresh",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("ingest_scheduler_blocking_stopped")
