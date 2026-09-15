"""First official-scheme crawl. Writes through SchemeIngestionService, then commits.

Run from backend/:

    # PowerShell: Postgres 18 may set a missing CA path
    if ($env:CURL_CA_BUNDLE) { Remove-Item Env:CURL_CA_BUNDLE }
    python -m scripts.ingest_official_schemes

Safe to re-run: identical content hashes do not create duplicate versions.
"""

from __future__ import annotations

import os
from collections import Counter

os.environ.pop("CURL_CA_BUNDLE", None)

from sqlalchemy import func, select

from app.core.database import SessionLocal
from app.models.enums import SCHEME_CATEGORIES
from app.models.schemes import Scheme, SchemeVersion
from app.services.ingestion.pipeline import SchemeIngestionService

CIVIC_SECTORS = tuple(item for item in SCHEME_CATEGORIES if item != "other")


def main() -> None:
    session = SessionLocal()
    try:
        results = SchemeIngestionService(session).ingest_registry()
        session.commit()
        schemes = session.scalar(select(func.count()).select_from(Scheme)) or 0
        versions = session.scalar(select(func.count()).select_from(SchemeVersion)) or 0
        published = (
            session.scalar(select(func.count()).select_from(Scheme).where(Scheme.status == "published")) or 0
        )
        summary = Counter(item.status for item in results)
        print("ingest_status", dict(summary))
        for item in results:
            print(
                f"  {item.status:6} rows={item.rows_upserted} versions={item.versions_created}"
                f" unchanged={item.unchanged} {item.source_url}"
                + (f" err={item.error_code} {item.detail}" if item.status == "failed" else "")
            )
        print("scheme_rows", int(schemes))
        print("scheme_versions", int(versions))
        print("published_schemes", int(published))
        counts = dict(
            session.execute(
                select(Scheme.category, func.count())
                .where(Scheme.status == "published")
                .group_by(Scheme.category)
            ).all()
        )
        print("published_by_sector")
        for sector in CIVIC_SECTORS:
            print(f"  {sector} {int(counts.get(sector, 0))}")
        leftover = {key: int(value) for key, value in counts.items() if key not in CIVIC_SECTORS}
        if leftover:
            print("published_other_categories", leftover)
        missing = [sector for sector in CIVIC_SECTORS if int(counts.get(sector, 0)) < 1]
        print("sector_gaps", missing)
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
