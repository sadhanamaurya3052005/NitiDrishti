"""Named medallion stages. Airflow is the production orchestrator."""

from __future__ import annotations

from app.config import settings

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


def orchestrator_name() -> str:
    return (settings.pipeline_orchestrator or "airflow").strip().lower()


ORCHESTRATOR = "airflow"  # documented default; runtime value from orchestrator_name()
AIRFLOW_IMPLEMENTED = True
AIRFLOW_BLOCKER = None
