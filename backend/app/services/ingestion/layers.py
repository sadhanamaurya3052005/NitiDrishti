"""Named medallion stages. This is the ingest package — not a second data_pipeline tree."""

from __future__ import annotations

# Interview / PPT map. Airflow is not in this repo; APScheduler runs the same path.
PIPELINE_STAGES = (
    "source_registry",
    "ingestion",
    "bronze",
    "validation",
    "parse_ocr",
    "normalize",
    "silver",
    "extraction",
    "human_review",
    "gold",
    "provenance",
    "ast",
)

PRINCIPLE = "AI extracts → evidence verifies → versioning preserves → AST decides"
ORCHESTRATOR = "apscheduler"
AIRFLOW_IMPLEMENTED = False
