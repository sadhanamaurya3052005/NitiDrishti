"""Read-only Step 7 data-quality snapshot against the live database.

Does not insert fixtures or mutate rows. Run from backend/:
  python -m scripts.step7_dq_snapshot
"""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import text

from app.core.database import engine


def _one(conn, sql: str) -> Any:
    return conn.execute(text(sql)).scalar()


def _rows(conn, sql: str) -> list[dict[str, Any]]:
    return [dict(row) for row in conn.execute(text(sql)).mappings()]


def main() -> None:
    with engine.connect() as conn:
        report = {
            "sources_total": _one(conn, "SELECT COUNT(*) FROM sources"),
            "sources_active": _one(conn, "SELECT COUNT(*) FROM sources WHERE is_active"),
            "sources_inactive": _one(conn, "SELECT COUNT(*) FROM sources WHERE NOT is_active"),
            "source_documents": _one(conn, "SELECT COUNT(*) FROM source_documents"),
            "ingestion_logs": _one(conn, "SELECT COUNT(*) FROM ingestion_logs"),
            "logs_ok": _one(conn, "SELECT COUNT(*) FROM ingestion_logs WHERE status = 'ok'"),
            "logs_failed": _one(conn, "SELECT COUNT(*) FROM ingestion_logs WHERE status = 'failed'"),
            "fail_robots": _one(
                conn,
                "SELECT COUNT(*) FROM ingestion_logs WHERE status = 'failed' AND detail ILIKE '%robots%'",
            ),
            "fail_404": _one(
                conn,
                "SELECT COUNT(*) FROM ingestion_logs WHERE status = 'failed' AND detail ILIKE '%404%'",
            ),
            "fail_tls": _one(
                conn,
                "SELECT COUNT(*) FROM ingestion_logs WHERE status = 'failed' "
                "AND (detail ILIKE '%SSL%' OR detail ILIKE '%TLS%')",
            ),
            "schemes": _one(conn, "SELECT COUNT(*) FROM schemes"),
            "schemes_published": _one(conn, "SELECT COUNT(*) FROM schemes WHERE status = 'published'"),
            "schemes_needs_review": _one(
                conn, "SELECT COUNT(*) FROM schemes WHERE status = 'needs_review'"
            ),
            "scheme_versions": _one(conn, "SELECT COUNT(*) FROM scheme_versions"),
            "multi_version_schemes": _one(
                conn,
                "SELECT COUNT(*) FROM (SELECT scheme_id FROM scheme_versions "
                "GROUP BY scheme_id HAVING COUNT(*) > 1) t",
            ),
            "policies": _one(conn, "SELECT COUNT(*) FROM policies"),
            "policy_versions": _one(conn, "SELECT COUNT(*) FROM policy_versions"),
            "dup_source_urls": _one(
                conn,
                "SELECT COUNT(*) FROM (SELECT source_url FROM sources "
                "GROUP BY source_url HAVING COUNT(*) > 1) t",
            ),
            "dup_hashes_per_source": _one(
                conn,
                "SELECT COUNT(*) FROM (SELECT source_id, content_hash FROM source_documents "
                "GROUP BY 1, 2 HAVING COUNT(*) > 1) t",
            ),
            "orphan_docs": _one(
                conn,
                "SELECT COUNT(*) FROM source_documents d "
                "LEFT JOIN sources s ON s.id = d.source_id WHERE s.id IS NULL",
            ),
            "orphan_versions": _one(
                conn,
                "SELECT COUNT(*) FROM scheme_versions v "
                "LEFT JOIN schemes s ON s.id = v.scheme_id WHERE s.id IS NULL",
            ),
            "orphan_rules": _one(
                conn,
                "SELECT COUNT(*) FROM eligibility_rules r "
                "LEFT JOIN scheme_versions v ON v.id = r.scheme_version_id WHERE v.id IS NULL",
            ),
            "bad_current_ptr": _one(
                conn,
                "SELECT COUNT(*) FROM schemes s "
                "LEFT JOIN scheme_versions v ON v.id = s.current_version_id "
                "WHERE s.current_version_id IS NOT NULL "
                "AND (v.id IS NULL OR v.scheme_id <> s.id)",
            ),
            "published_no_ptr": _one(
                conn,
                "SELECT COUNT(*) FROM schemes "
                "WHERE status = 'published' AND current_version_id IS NULL",
            ),
            "versions_missing_source_url": _one(
                conn,
                "SELECT COUNT(*) FROM scheme_versions "
                "WHERE source_url IS NULL OR btrim(source_url) = ''",
            ),
            "versions_missing_doc": _one(
                conn, "SELECT COUNT(*) FROM scheme_versions WHERE source_document_id IS NULL"
            ),
            "lineage": _rows(
                conn,
                """
                SELECT s.slug, s.status, sv.version_number, sv.name, sv.source_url,
                       sv.retrieved_at::text AS retrieved_at, sd.content_hash, sd.storage_path,
                       src.source_url AS registry_url, src.domain
                FROM schemes s
                JOIN scheme_versions sv ON sv.id = s.current_version_id
                LEFT JOIN source_documents sd ON sd.id = sv.source_document_id
                LEFT JOIN sources src ON src.id = sd.source_id
                WHERE s.status = 'published' AND sd.content_hash IS NOT NULL
                ORDER BY sv.retrieved_at DESC NULLS LAST
                LIMIT 1
                """,
            ),
        }
    print(json.dumps(report, indent=2, default=str))


if __name__ == "__main__":
    main()
