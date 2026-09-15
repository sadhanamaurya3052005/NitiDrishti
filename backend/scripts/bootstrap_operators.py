"""Seed WELFARE_OFFICER, ADMIN, and CSC_OPERATOR accounts from env.

Register stays CITIZEN-only. Re-run is idempotent. No beneficiary KPIs.

    if ($env:CURL_CA_BUNDLE) { Remove-Item Env:CURL_CA_BUNDLE }
    python -m scripts.bootstrap_operators
"""

from __future__ import annotations

import os

os.environ.pop("CURL_CA_BUNDLE", None)

from app.core.database import SessionLocal
from app.core.logging import configure_logging, get_logger
from app.services.auth.bootstrap import bootstrap_operators

configure_logging()
log = get_logger("nitidrishti.bootstrap")


def main() -> None:
    session = SessionLocal()
    try:
        results = bootstrap_operators(session)
        session.commit()
        for row in results:
            print(f"{row.status}\t{row.role}\t{row.email}\t{row.detail}".rstrip())
            log.info(
                "bootstrap_operator",
                status=row.status,
                role=row.role,
                detail=row.detail or "ok",
            )
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
