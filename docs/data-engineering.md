# Data Engineering — NitiDrishti pipeline

Status legend: **IMPLEMENTED** | **PARTIAL** | **OPTIONAL** | **FUTURE**

## Architecture (IMPLEMENTED)

```
OFFICIAL SOURCES (whitelist + robots fail-closed)
        ↓
APACHE AIRFLOW  DAG nitidrishti_ingestion_pipeline
        ↓
PYTHON INGESTION  (existing connectors / Scheme|Policy|Opportunity services)
        ↓
MINIO nitidrishti-raw  OR filesystem fallback when MINIO_ENDPOINT unset
        ↓
PYSPARK local[1]  spark_jobs/normalize_silver.py  → storage/silver/
        ↓
DBT CORE  staging → intermediate → marts (schema dbt_nitidrishti)
        ↓
POSTGRESQL application DB (unchanged serving / AST / HITL)
        ↓
DETERMINISTIC AST  → FastAPI → Next.js (frontend unchanged)
```

## Orchestration

| Item | Value |
|---|---|
| Production orchestrator | **Airflow** (`PIPELINE_ORCHESTRATOR=airflow`) |
| Legacy | `PIPELINE_ORCHESTRATOR=apscheduler` only; dual-run refused |
| DAG | `nitidrishti_ingestion_pipeline` |
| Schedule | `0 2 * * *` UTC |
| Retries | 2 (default_args), 5 min delay |
| Stage runner | `python -m scripts.pipeline_stages <stage>` |
| `publish_gold` | BashOperator → `publish_gold` stage: verifies HITL gate (`POST /api/v1/review/schemes/{id}`); **never auto-publishes** |

APScheduler inside uvicorn is **disabled** when orchestrator is `airflow`.

## Medallion + storage

| Layer | Location | Notes |
|---|---|---|
| RAW / Bronze | MinIO `s3://nitidrishti-raw/{source_id}/{YYYY-MM-DD}/{sha256}.ext` or `storage/raw/...` | Immutable; SHA idempotent |
| Silver | `storage/silver/documents_silver.jsonl` | Spark or Python fallback |
| Gold (app) | `schemes` / `scheme_versions` published via HITL | Not auto-published by DAG |
| Gold (dbt) | `dbt_nitidrishti.mart_published_schemes` | Analytical mart; not CRUD |

Migrate existing RAW: `python -m scripts.migrate_raw_to_minio` (SHA verified; no delete).

## Docker (IMPLEMENTED — requires Docker Desktop)

```bash
docker compose up -d
# Airflow UI http://localhost:8080  (admin/admin by default — change in .env)
# MinIO API  :9000  Console :9001
```

Services: `minio`, `minio-init`, `airflow-db` (metadata **separate** from app Postgres), `airflow-init`, `airflow-webserver`, `airflow-scheduler`.

Application PostgreSQL remains host/native (not reset by Compose).

**Live verification note (2026-09-25):** On the agent host, `docker` / Docker Desktop were **not** on PATH and no Docker install was found under Program Files. Compose + DAG files are in-repo; live Airflow/MinIO bring-up remains blocked until Docker Desktop is installed, running, and visible to the shell (`docker --version` succeeds). Do not claim Airflow/MinIO LIVE VERIFIED until that works.

## dbt (IMPLEMENTED models; needs live Postgres for run/test)

```bash
cd dbt
dbt parse --profiles-dir .
dbt run --profiles-dir .
dbt test --profiles-dir .
```

## Spark (IMPLEMENTED with Python fallback)

```bash
# from repo root, with backend on PYTHONPATH
python -m spark_jobs.normalize_silver
# or: python -m scripts.pipeline_stages spark_normalize_silver
```

## CI (IMPLEMENTED)

`.github/workflows/ci.yml` — backend pytest, DAG/Spark tests, dbt parse, frontend build, `docker compose config`.

CD deployment: **FUTURE** (no deploy target configured).

## Provenance / DQ / AST

Unchanged application authority: `source_documents`, SHA-256, HITL `/api/v1/review`, `validate_ast`, `no_rules` blocking, failure taxonomy on `ingestion_logs`.

OpenLineage: **OPTIONAL / FUTURE** — existing lineage API remains authoritative.

## Local without Docker

1. Keep `PIPELINE_ORCHESTRATOR=airflow` and trigger stages manually:
   `python -m scripts.pipeline_stages source_registry_check`
2. Or temporary `PIPELINE_ORCHESTRATOR=apscheduler` + `INGEST_SCHEDULER_ENABLED=true` for legacy process only — never alongside Airflow.
