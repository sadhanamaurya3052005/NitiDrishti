"""CLI stages invoked by Airflow tasks. Business logic stays in services."""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter
from pathlib import Path

# Ensure backend root is importable when Airflow mounts /opt/airflow or /app
_BACKEND = Path(__file__).resolve().parents[1]
_REPO = _BACKEND.parent
for _p in (_BACKEND, _REPO):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

os.environ.pop("CURL_CA_BUNDLE", None)


def _session():
    from app.core.database import SessionLocal

    return SessionLocal()


def source_registry_check() -> dict:
    from app.services.ingestion.opportunity_registry import OPPORTUNITY_SOURCES
    from app.services.ingestion.policy_registry import POLICY_SOURCES
    from app.services.ingestion.registry import FIRST_CRAWL_SOURCES

    return {
        "schemes": len(FIRST_CRAWL_SOURCES),
        "policies": len(POLICY_SOURCES),
        "opportunities": len(OPPORTUNITY_SOURCES),
        "status": "ok",
    }


def fetch_and_ingest_schemes() -> dict:
    from app.services.ingestion.pipeline import SchemeIngestionService

    session = _session()
    try:
        results = SchemeIngestionService(session).ingest_registry()
        session.commit()
        return {
            "status": "ok",
            "counts": dict(Counter(item.status for item in results)),
            "rows": len(results),
        }
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def fetch_and_ingest_policies() -> dict:
    from app.services.ingestion.policy_pipeline import PolicyIngestionService

    session = _session()
    try:
        results = PolicyIngestionService(session).ingest_registry()
        session.commit()
        return {"status": "ok", "counts": dict(Counter(item.status for item in results))}
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def fetch_and_ingest_opportunities() -> dict:
    from app.services.ingestion.opportunity_pipeline import OpportunityIngestionService

    session = _session()
    try:
        results = OpportunityIngestionService(session).ingest_registry()
        session.commit()
        return {"status": "ok", "counts": dict(Counter(item.status for item in results))}
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def quality_lineage_metrics() -> dict:
    from app.services.pipeline_map import PipelineMapService

    session = _session()
    try:
        snap = PipelineMapService(session).snapshot()
        return {
            "status": "ok",
            "dead_letter": snap.get("dead_letter"),
            "metrics": snap.get("metrics"),
            "layers": snap.get("layers"),
            "orchestrator": snap.get("orchestrator"),
        }
    finally:
        session.close()


def hitl_gate_report() -> dict:
    """Report needs_review count. Does not auto-publish."""
    from sqlalchemy import func, select

    from app.models.schemes import Scheme

    session = _session()
    try:
        pending = int(
            session.scalar(select(func.count()).select_from(Scheme).where(Scheme.status == "needs_review"))
            or 0
        )
        return {"status": "ok", "HITL_pending": pending, "auto_publish": False}
    finally:
        session.close()


def publish_gold_verify() -> dict:
    """Verify GOLD serving state. Does NOT auto-publish.

    Publication is exclusively HITL via POST /api/v1/review/schemes/{id}
    (SchemeCatalogService.review_scheme → status=published). This stage fails
    closed if the review mechanism is missing; it never invents a publish.
    """
    from sqlalchemy import func, select

    from app.models.schemes import Scheme
    from app.services.schemes import SchemeCatalogService

    if not hasattr(SchemeCatalogService, "review_scheme"):
        return {
            "status": "failed",
            "reason": "HITL review_scheme missing — cannot claim gold publish path",
        }

    session = _session()
    try:
        published = int(
            session.scalar(select(func.count()).select_from(Scheme).where(Scheme.status == "published"))
            or 0
        )
        pending = int(
            session.scalar(select(func.count()).select_from(Scheme).where(Scheme.status == "needs_review"))
            or 0
        )
        return {
            "status": "ok",
            "auto_publish": False,
            "published_by_this_task": False,
            "publisher": "POST /api/v1/review/schemes/{scheme_id}",
            "gold_published_count": published,
            "HITL_pending": pending,
            "note": "EmptyOperator removed; this task only verifies the HITL publish gate.",
        }
    finally:
        session.close()


def run_spark_silver() -> dict:
    from spark_jobs.normalize_silver import run_normalize_silver

    return run_normalize_silver()


def run_dbt() -> dict:
    """Invoke dbt when available; otherwise report skip for environments without dbt."""
    import shutil
    import subprocess

    dbt_root = _BACKEND.parent / "dbt"
    if shutil.which("dbt") is None:
        return {"status": "skipped", "reason": "dbt CLI not installed in this process"}
    if not dbt_root.exists():
        return {"status": "skipped", "reason": "dbt project missing"}
    common = ["--project-dir", str(dbt_root), "--profiles-dir", str(dbt_root)]
    parsed = subprocess.run(["dbt", "parse", *common], capture_output=True, text=True, check=False)
    if parsed.returncode != 0:
        return {"status": "failed", "stage": "parse", "stderr": parsed.stderr[-2000:]}
    ran = subprocess.run(["dbt", "run", *common], capture_output=True, text=True, check=False)
    if ran.returncode != 0:
        return {
            "status": "failed",
            "stage": "run",
            "stderr": ran.stderr[-2000:],
            "stdout": ran.stdout[-2000:],
        }
    tested = subprocess.run(["dbt", "test", *common], capture_output=True, text=True, check=False)
    return {
        "status": "ok" if tested.returncode == 0 else "failed",
        "parse": "ok",
        "run": "ok",
        "test_code": tested.returncode,
        "stdout": tested.stdout[-2000:],
        "stderr": tested.stderr[-2000:],
    }


STAGES = {
    "source_registry_check": source_registry_check,
    "fetch_sources": fetch_and_ingest_schemes,
    "ingest_policies": fetch_and_ingest_policies,
    "ingest_opportunities": fetch_and_ingest_opportunities,
    "spark_normalize_silver": run_spark_silver,
    "dbt_transform": run_dbt,
    "quality_lineage_metrics": quality_lineage_metrics,
    "hitl_gate": hitl_gate_report,
    "publish_gold": publish_gold_verify,
}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="NitiDrishti pipeline stage runner for Airflow")
    parser.add_argument("stage", choices=sorted(STAGES))
    args = parser.parse_args(argv)
    result = STAGES[args.stage]()
    print(json.dumps(result, default=str))
    if isinstance(result, dict) and result.get("status") == "failed":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
