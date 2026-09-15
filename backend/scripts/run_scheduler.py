"""Native batch-refresh process (no Docker).

This is scheduled ingestion, not a live government feed. Robots.txt is fail-closed
and each connector waits INGESTION crawl delay between sources.

    if ($env:CURL_CA_BUNDLE) { Remove-Item Env:CURL_CA_BUNDLE }
    python -m scripts.run_scheduler

To attach the same job to uvicorn, scheduled catalogue refresh is on by default
(INGEST_SCHEDULER_ENABLED / INGEST_SCHEDULE_ENABLED). Tests never start the crawler.
"""

from __future__ import annotations

import os

os.environ.pop("CURL_CA_BUNDLE", None)

from app.core.logging import configure_logging
from app.services.ingestion.scheduler import run_blocking_scheduler

configure_logging()


def main() -> None:
    run_blocking_scheduler(run_immediately=True)


if __name__ == "__main__":
    main()
