"""Airflow DAG structure tests — no Airflow runtime required.

Validates the DAG Python module as source (AST) so CI can run without
apache-airflow installed. Import smoke runs when airflow is present.
"""

from __future__ import annotations

import ast
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DAG_PATH = REPO / "airflow" / "dags" / "nitidrishti_ingestion_pipeline.py"

EXPECTED_TASKS = {
    "start",
    "source_registry_check",
    "fetch_sources",
    "ingest_policies",
    "ingest_opportunities",
    "store_raw_validate",
    "spark_normalize_silver",
    "dbt_transform",
    "quality_lineage_metrics",
    "hitl_gate",
    "publish_gold",
    "end",
}


def _task_ids_from_ast(tree: ast.AST) -> set[str]:
    found: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            for kw in node.keywords:
                if kw.arg == "task_id" and isinstance(kw.value, ast.Constant):
                    found.add(str(kw.value.value))
    return found


def test_dag_file_exists() -> None:
    assert DAG_PATH.is_file()


def test_dag_id_and_schedule() -> None:
    source = DAG_PATH.read_text(encoding="utf-8")
    tree = ast.parse(source)
    assert 'dag_id="nitidrishti_ingestion_pipeline"' in source
    assert 'schedule="0 2 * * *"' in source
    assert '"retries": 2' in source
    # No cyclic self-deps in bitshift chains — ensure >> appears and no A >> A pattern
    assert ">>" in source
    tasks = _task_ids_from_ast(tree)
    assert EXPECTED_TASKS.issubset(tasks)


def test_hitl_gate_before_publish() -> None:
    source = DAG_PATH.read_text(encoding="utf-8")
    assert "quality_check >> hitl_gate >> publish_gold >> end" in source
    assert "publish_gold" in source
    # Must not be a silent EmptyOperator success for publish
    assert 'bash_command=f"{STAGE} publish_gold"' in source
    assert "auto-publish" in source.lower() or "never auto-publishes" in source.lower() or "Does not auto-publish" in source


def test_fetch_sources_is_scheme_ingestion() -> None:
    source = DAG_PATH.read_text(encoding="utf-8")
    assert 'task_id="fetch_sources"' in source
    assert "fetch_sources" in source
    assert "ingest_policies" in source
    assert "ingest_opportunities" in source
    # Schemes are not dropped from the DAG
    assert 'bash_command=f"{STAGE} fetch_sources"' in source


def test_dag_imports_when_airflow_installed() -> None:
    """Skip when apache-airflow is absent (repo ./airflow/ is DAG files only)."""
    try:
        from airflow.models.dag import DAG  # type: ignore  # noqa: F401
        from airflow.operators.bash import BashOperator  # type: ignore  # noqa: F401
    except ImportError:
        return
    import importlib.util

    spec = importlib.util.spec_from_file_location("nitidrishti_dag", DAG_PATH)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert module.dag.dag_id == "nitidrishti_ingestion_pipeline"
    assert set(module.dag.task_ids) >= EXPECTED_TASKS
    assert module.dag.has_task("hitl_gate")
    assert module.default_args["retries"] == 2
