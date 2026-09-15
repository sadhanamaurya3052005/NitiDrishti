"""Deterministic eligibility and scheme compare."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import OptionalUser, request_id_of
from app.schemas.citizen import CompareRequest, EligibilityRequest
from app.schemas.envelope import ok
from app.services.eligibility import EligibilityService

router = APIRouter(prefix="/api/v1", tags=["eligibility"])

DbSession = Annotated[Session, Depends(get_db)]


@router.post("/eligibility", summary="Evaluate gazette AST rules")
def evaluate_eligibility(
    payload: EligibilityRequest,
    request: Request,
    db: DbSession,
    user: OptionalUser,
) -> dict:
    data = EligibilityService(db).evaluate(
        scheme_ids=payload.scheme_ids,
        declared=payload.profile,
        user=user,
    )
    return ok(data, request_id_of(request))


@router.post("/compare", summary="Compare two or more published schemes")
def compare_schemes(
    payload: CompareRequest,
    request: Request,
    db: DbSession,
    user: OptionalUser,
) -> dict:
    data = EligibilityService(db).compare(
        scheme_ids=payload.scheme_ids,
        declared=payload.profile,
        user=user,
    )
    return ok(data, request_id_of(request))
