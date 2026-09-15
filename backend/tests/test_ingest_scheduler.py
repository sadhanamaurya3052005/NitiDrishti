"""Scheduled refresh is batch-only and must never live-crawl during tests."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

from app.config import Settings
from app.services.ingestion.scheduler import (
    first_job_time,
    ingest_interval_hours,
    run_scheduled_refresh,
    scheduler_should_run,
    start_background_scheduler,
)


def test_scheduler_default_is_on_outside_tests() -> None:
    assert Settings.model_construct().ingest_scheduler_enabled is True


def test_scheduler_stays_off_under_pytest() -> None:
    with patch("app.services.ingestion.scheduler.settings") as mocked:
        mocked.app_env = "development"
        mocked.ingest_scheduler_enabled = True
        assert scheduler_should_run() is False


def test_scheduler_stays_off_when_testing_env() -> None:
    with (
        patch("app.services.ingestion.scheduler._in_test_process", return_value=False),
        patch("app.services.ingestion.scheduler.settings") as mocked,
    ):
        mocked.app_env = "testing"
        mocked.ingest_scheduler_enabled = True
        assert scheduler_should_run() is False


def test_scheduler_follows_enabled_flag_outside_tests() -> None:
    with (
        patch("app.services.ingestion.scheduler._in_test_process", return_value=False),
        patch("app.services.ingestion.scheduler.settings") as mocked,
    ):
        mocked.app_env = "development"
        mocked.ingest_scheduler_enabled = True
        assert scheduler_should_run() is True
        mocked.ingest_scheduler_enabled = False
        assert scheduler_should_run() is False


def test_interval_hours_has_a_floor() -> None:
    with patch("app.services.ingestion.scheduler.settings") as mocked:
        mocked.ingest_interval_hours = 0
        assert ingest_interval_hours() == 1
        mocked.ingest_interval_hours = 24
        assert ingest_interval_hours() == 24


def test_background_scheduler_does_not_start_in_tests() -> None:
    assert start_background_scheduler() is None


def test_first_job_waits_out_a_recent_run() -> None:
    now = datetime(2026, 9, 15, 10, 0, tzinfo=UTC)
    last = now - timedelta(hours=1)
    with patch("app.services.ingestion.scheduler.ingest_interval_hours", return_value=24):
        due = first_job_time(now=now, last=last)
    assert due == last + timedelta(hours=24)


def test_first_job_waits_interval_when_catalogue_is_cold() -> None:
    now = datetime(2026, 9, 15, 10, 0, tzinfo=UTC)
    with patch("app.services.ingestion.scheduler.ingest_interval_hours", return_value=24):
        due = first_job_time(now=now, last=None)
    assert due == now + timedelta(hours=24)


def test_first_job_runs_after_grace_when_interval_elapsed() -> None:
    now = datetime(2026, 9, 15, 10, 0, tzinfo=UTC)
    last = now - timedelta(hours=30)
    with patch("app.services.ingestion.scheduler.ingest_interval_hours", return_value=24):
        due = first_job_time(now=now, last=last)
    assert due == now + timedelta(seconds=60)


def test_refresh_skips_when_a_run_just_happened() -> None:
    session = MagicMock()
    with (
        patch("app.services.ingestion.scheduler.refresh_too_recent", return_value=True),
        patch("app.services.ingestion.scheduler.SchemeIngestionService") as schemes,
    ):
        summary = run_scheduled_refresh(session_factory=lambda: session)
    schemes.assert_not_called()
    session.commit.assert_not_called()
    session.close.assert_called_once_with()
    assert summary["skipped"] is True
    assert summary["live_feed"] is False


def test_refresh_calls_ingest_services_without_live_fetch() -> None:
    session = MagicMock()
    scheme_service = MagicMock()
    policy_service = MagicMock()
    opportunity_service = MagicMock()
    scheme_service.ingest_registry.return_value = [MagicMock(status="ok")]
    policy_service.ingest_registry.return_value = [MagicMock(status="ok")]
    opportunity_service.ingest_registry.return_value = [MagicMock(status="failed")]

    with (
        patch("app.services.ingestion.scheduler.refresh_too_recent", return_value=False),
        patch(
            "app.services.ingestion.scheduler.SchemeIngestionService",
            return_value=scheme_service,
        ),
        patch(
            "app.services.ingestion.scheduler.PolicyIngestionService",
            return_value=policy_service,
        ),
        patch(
            "app.services.ingestion.scheduler.OpportunityIngestionService",
            return_value=opportunity_service,
        ),
    ):
        summary = run_scheduled_refresh(session_factory=lambda: session)

    scheme_service.ingest_registry.assert_called_once_with()
    policy_service.ingest_registry.assert_called_once_with()
    opportunity_service.ingest_registry.assert_called_once_with()
    session.commit.assert_called_once_with()
    session.close.assert_called_once_with()
    assert summary["live_feed"] is False
    assert summary["skipped"] is False
    assert summary["mode"] == "batch_refresh"
    assert summary["schemes"] == {"ok": 1}
    assert summary["opportunities"] == {"failed": 1}
