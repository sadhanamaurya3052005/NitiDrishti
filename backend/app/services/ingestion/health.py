"""Source health rollup from real ingestion outcomes. No fabricated statistics."""

from __future__ import annotations

from datetime import UTC, datetime

from app.models.ingestion import Source


def health_status_for(source: Source, *, success: bool) -> str:
    if not source.is_active:
        return "INACTIVE"
    if success:
        return "HEALTHY"
    failures = int(source.consecutive_failures or 0)
    if failures >= 3:
        return "FAILING"
    if failures >= 1:
        return "DEGRADED"
    return "UNKNOWN"


def apply_ingest_outcome(
    source: Source,
    *,
    success: bool,
    http_status: int | None = None,
    error_code: str | None = None,
    content_hash: str | None = None,
    duration_ms: int | None = None,
    at: datetime | None = None,
) -> None:
    """Mutate source rollup fields. Caller flushes/commits."""
    stamp = at or datetime.now(UTC)
    source.last_checked_at = stamp
    source.last_http_status = http_status
    source.last_error_code = error_code
    if content_hash:
        source.last_content_hash = content_hash
    if duration_ms is not None:
        source.last_fetch_duration_ms = max(0, int(duration_ms))
    if success:
        source.last_success_at = stamp
        source.consecutive_failures = 0
        source.total_successes = int(source.total_successes or 0) + 1
        source.last_error_code = None
    else:
        source.last_failure_at = stamp
        source.consecutive_failures = int(source.consecutive_failures or 0) + 1
        source.total_failures = int(source.total_failures or 0) + 1
    source.health_status = health_status_for(source, success=success)
