"""Public scheme catalog until Phase 7 ingestion is wired to PostgreSQL."""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Query

from app.data.official_schemes import OFFICIAL_SCHEMES

router = APIRouter(prefix="/api/v1", tags=["schemes"])


@router.get("/schemes", summary="List official scheme catalog")
def list_schemes(
    category: str | None = Query(default=None),
    q: str | None = Query(default=None),
) -> dict:
    query = (q or "").strip().lower()
    items = []
    for scheme in OFFICIAL_SCHEMES:
        if category and category != "all" and scheme["category"] != category:
            continue
        blob = f"{scheme['name']} {scheme['nameHi']} {scheme['summary']}".lower()
        if query and query not in blob:
            continue
        items.append(scheme)

    return {
        "success": True,
        "data": {"schemes": items},
        "error": None,
        "request_id": str(uuid4()),
    }
