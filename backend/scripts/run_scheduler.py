"""Legacy blocking APScheduler process (local-only escape hatch).

Production / Docker Compose use Apache Airflow as the sole orchestrator
(PIPELINE_ORCHESTRATOR=airflow). This script refuses to start when Airflow
is configured, to prevent dual schedulers.

    $env:PIPELINE_ORCHESTRATOR='apscheduler'
    python -m scripts.run_scheduler
"""

from __future__ import annotations

import os
import sys

os.environ.pop("CURL_CA_BUNDLE", None)

from app.config import settings
from app.core.logging import configure_logging, get_logger
from app.services.ingestion.scheduler import run_blocking_scheduler

configure_logging()
log = get_logger("nitidrishti.run_scheduler")


def main() -> None:
    if (settings.pipeline_orchestrator or "airflow").strip().lower() == "airflow":
        log.error(
            "refusing_dual_scheduler",
            note="PIPELINE_ORCHESTRATOR=airflow. Use Airflow DAG nitidrishti_ingestion_pipeline, "
            "or set PIPELINE_ORCHESTRATOR=apscheduler for this legacy process only.",
        )
        raise SystemExit(2)
    run_blocking_scheduler(run_immediately=True)


if __name__ == "__main__":
    main()
