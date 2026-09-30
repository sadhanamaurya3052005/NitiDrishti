"""Airflow DAG: NitiDrishti official-source ingestion medallion pipeline.

Business logic lives in backend services; this DAG only orchestrates stages.
Requires Airflow 2.x. APScheduler must remain disabled while this DAG is active.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.empty import EmptyOperator

BACKEND = Path(__file__).resolve().parents[2] / "backend"
PYTHON = "python"
STAGE = f"cd {BACKEND} && {PYTHON} -m scripts.pipeline_stages"

default_args = {
    "owner": "nitidrishti",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "execution_timeout": timedelta(hours=2),
}

with DAG(
    dag_id="nitidrishti_ingestion_pipeline",
    description="Official-source → RAW/MinIO → Silver/Spark → dbt Gold → lineage metrics",
    default_args=default_args,
    schedule="0 2 * * *",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["nitidrishti", "ingestion", "medallion"],
) as dag:
    start = EmptyOperator(task_id="start")

    source_registry_check = BashOperator(
        task_id="source_registry_check",
        bash_command=f"{STAGE} source_registry_check",
    )
    fetch_sources = BashOperator(
        task_id="fetch_sources",
        bash_command=f"{STAGE} fetch_sources",
        retries=1,
    )
    ingest_policies = BashOperator(
        task_id="ingest_policies",
        bash_command=f"{STAGE} ingest_policies",
    )
    ingest_opportunities = BashOperator(
        task_id="ingest_opportunities",
        bash_command=f"{STAGE} ingest_opportunities",
    )
    store_raw_validate = EmptyOperator(
        task_id="store_raw_validate",
        doc="RAW persistence + SHA idempotency occur inside fetch_sources (persist_snapshot).",
    )
    spark_normalize_silver = BashOperator(
        task_id="spark_normalize_silver",
        bash_command=f"{STAGE} spark_normalize_silver",
    )
    dbt_transform = BashOperator(
        task_id="dbt_transform",
        bash_command=f"{STAGE} dbt_transform",
    )
    quality_check = BashOperator(
        task_id="quality_lineage_metrics",
        bash_command=f"{STAGE} quality_lineage_metrics",
    )
    hitl_gate = BashOperator(
        task_id="hitl_gate",
        bash_command=f"{STAGE} hitl_gate",
        doc="Reports needs_review; never auto-publishes.",
    )
    publish_gold = BashOperator(
        task_id="publish_gold",
        bash_command=f"{STAGE} publish_gold",
        doc=(
            "Verifies HITL publish gate (POST /api/v1/review). "
            "Does not auto-publish; published_by_this_task is always false."
        ),
    )
    end = EmptyOperator(task_id="end")

    start >> source_registry_check
    source_registry_check >> [fetch_sources, ingest_policies, ingest_opportunities]
    fetch_sources >> store_raw_validate >> spark_normalize_silver >> dbt_transform
    ingest_policies >> dbt_transform
    ingest_opportunities >> dbt_transform
    dbt_transform >> quality_check >> hitl_gate >> publish_gold >> end
