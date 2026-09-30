"""PySpark (or pure-Python fallback) SILVER normalization over real bronze manifests."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

# Reuse deterministic normalizers from the app (no invented government rows).
import sys

_BACKEND = Path(__file__).resolve().parents[1] / "backend"
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.services.ingestion.hashing import sha256_text  # noqa: E402
from app.services.ingestion.normalize import date_from_text, rupees_from_text  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[1]
SILVER_DIR = REPO_ROOT / "storage" / "silver"


def _load_bronze_manifest() -> list[dict[str, Any]]:
    """Build a bronze manifest from PostgreSQL source_documents — real project data only."""
    from sqlalchemy import select

    from app.core.database import SessionLocal
    from app.models.ingestion import Source, SourceDocument

    session = SessionLocal()
    try:
        rows = session.execute(
            select(
                SourceDocument.id,
                SourceDocument.source_id,
                SourceDocument.uri,
                SourceDocument.content_hash,
                SourceDocument.mime_type,
                SourceDocument.byte_size,
                SourceDocument.storage_path,
                SourceDocument.retrieved_at,
                Source.source_url,
                Source.domain,
            ).join(Source, Source.id == SourceDocument.source_id)
        ).all()
        out: list[dict[str, Any]] = []
        for row in rows:
            out.append(
                {
                    "document_id": str(row.id),
                    "source_id": str(row.source_id),
                    "uri": row.uri,
                    "content_hash": row.content_hash,
                    "mime_type": row.mime_type,
                    "byte_size": row.byte_size,
                    "storage_path": row.storage_path,
                    "retrieved_at": row.retrieved_at.isoformat() if row.retrieved_at else None,
                    "source_url": row.source_url,
                    "domain": row.domain,
                }
            )
        return out
    finally:
        session.close()


def normalize_row(row: dict[str, Any]) -> dict[str, Any]:
    text_bits = " ".join(
        str(row.get(k) or "") for k in ("uri", "source_url", "mime_type", "domain")
    )
    amount = rupees_from_text(text_bits)
    parsed_date = date_from_text(text_bits)
    return {
        **row,
        "domain_norm": (row.get("domain") or "").lower().strip(),
        "mime_norm": (row.get("mime_type") or "application/octet-stream").split(";")[0].strip().lower(),
        "amount_rupees_sample": amount,
        "date_sample": None if parsed_date is None else parsed_date.isoformat(),
        "row_hash": sha256_text(json.dumps(row, sort_keys=True, default=str)),
        "silver_at": datetime.now(UTC).isoformat(),
    }


def _run_pyspark(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    from pyspark.sql import SparkSession
    from pyspark.sql import functions as F

    spark = (
        SparkSession.builder.master("local[1]")
        .appName("nitidrishti-silver")
        .config("spark.ui.enabled", "false")
        .config("spark.sql.shuffle.partitions", "1")
        .getOrCreate()
    )
    try:
        df = spark.createDataFrame(rows)
        df = (
            df.withColumn("domain_norm", F.lower(F.trim(F.col("domain"))))
            .withColumn(
                "mime_norm",
                F.lower(F.trim(F.split(F.coalesce(F.col("mime_type"), F.lit("application/octet-stream")), ";").getItem(0))),
            )
            .dropDuplicates(["content_hash", "source_id"])
        )
        return [normalize_row(r.asDict()) for r in df.collect()]
    finally:
        spark.stop()


def _run_python(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str, str]] = set()
    out: list[dict[str, Any]] = []
    for row in rows:
        key = (str(row.get("source_id")), str(row.get("content_hash")))
        if key in seen:
            continue
        seen.add(key)
        out.append(normalize_row(row))
    return out


def run_normalize_silver(*, use_spark: bool | None = None) -> dict[str, Any]:
    rows = _load_bronze_manifest()
    engine = "python"
    if use_spark is None:
        try:
            import pyspark  # noqa: F401

            use_spark = True
        except ImportError:
            use_spark = False
    if use_spark:
        try:
            silver = _run_pyspark(rows)
            engine = "pyspark"
        except Exception as exc:
            silver = _run_python(rows)
            engine = f"python_fallback:{type(exc).__name__}"
    else:
        silver = _run_python(rows)

    SILVER_DIR.mkdir(parents=True, exist_ok=True)
    out_path = SILVER_DIR / "documents_silver.jsonl"
    with out_path.open("w", encoding="utf-8") as handle:
        for row in silver:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
    return {
        "status": "ok",
        "engine": engine,
        "input_rows": len(rows),
        "output_rows": len(silver),
        "path": str(out_path.as_posix()),
    }


if __name__ == "__main__":
    print(json.dumps(run_normalize_silver(), indent=2))
