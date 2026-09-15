"""Official jobs / internships / scholarships crawl.

Run from backend/:

    if ($env:CURL_CA_BUNDLE) { Remove-Item Env:CURL_CA_BUNDLE }
    python -m scripts.ingest_opportunities
"""

from __future__ import annotations

import os
from collections import Counter

os.environ.pop("CURL_CA_BUNDLE", None)

from sqlalchemy import func, select

from app.core.database import SessionLocal
from app.models.opportunities import Internship, Job, Scholarship
from app.services.ingestion.opportunity_pipeline import OpportunityIngestionService


def main() -> None:
    session = SessionLocal()
    try:
        results = OpportunityIngestionService(session).ingest_registry()
        session.commit()
        jobs = session.scalar(select(func.count()).select_from(Job).where(Job.status == "published")) or 0
        internships = (
            session.scalar(select(func.count()).select_from(Internship).where(Internship.status == "published")) or 0
        )
        scholarships = (
            session.scalar(select(func.count()).select_from(Scholarship).where(Scholarship.status == "published"))
            or 0
        )
        summary = Counter(item.status for item in results)
        print("ingest_status", dict(summary))
        for item in results:
            print(
                f"  {item.status:6} rows={item.rows_upserted} versions={item.versions_created}"
                f" unchanged={item.unchanged} {item.source_url}"
                + (f" err={item.error_code} {item.detail}" if item.status == "failed" else "")
            )
        print("published_jobs", int(jobs))
        print("published_internships", int(internships))
        print("published_scholarships", int(scholarships))
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
