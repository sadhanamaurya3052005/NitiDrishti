"""Official Nyay-Mitra policy crawl (1-2 public pages).

Run from backend/:

    if ($env:CURL_CA_BUNDLE) { Remove-Item Env:CURL_CA_BUNDLE }
    python -m scripts.ingest_policies
"""

from __future__ import annotations

import os
from collections import Counter

os.environ.pop("CURL_CA_BUNDLE", None)

from sqlalchemy import func, select

from app.core.database import SessionLocal
from app.models.policy import Policy, PolicyChange, PolicyClause, PolicyVersion
from app.services.ingestion.policy_pipeline import PolicyIngestionService


def main() -> None:
    session = SessionLocal()
    try:
        results = PolicyIngestionService(session).ingest_registry()
        session.commit()
        policies = session.scalar(select(func.count()).select_from(Policy)) or 0
        versions = session.scalar(select(func.count()).select_from(PolicyVersion)) or 0
        clauses = session.scalar(select(func.count()).select_from(PolicyClause)) or 0
        summary = Counter(item.status for item in results)
        print("ingest_status", dict(summary))
        for item in results:
            print(
                f"  {item.status:6} rows={item.rows_upserted} versions={item.versions_created}"
                f" unchanged={item.unchanged} {item.source_url}"
                + (f" err={item.error_code} {item.detail}" if item.status == "failed" else "")
            )
        changes = session.scalar(select(func.count()).select_from(PolicyChange)) or 0
        print("policy_rows", int(policies))
        print("policy_versions", int(versions))
        print("policy_clauses", int(clauses))
        print("policy_changes", int(changes))
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
