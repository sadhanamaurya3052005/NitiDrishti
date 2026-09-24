"""ADMIN console API. Guests stay out; officers cannot assign roles."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import request_id_of, require_roles
from app.models.identity import User
from app.schemas.admin import RoleAssignmentRequest, UserStatusRequest
from app.schemas.envelope import ok
from app.services.admin import AdminService

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

DbSession = Annotated[Session, Depends(get_db)]
Operator = Annotated[User, Depends(require_roles("ADMIN"))]


def _service(db: Session) -> AdminService:
    return AdminService(db)


@router.get("/users", summary="Account directory — masked email, no profile PII")
def list_users(
    request: Request,
    db: DbSession,
    user: Operator,
    limit: int = Query(default=40, ge=1, le=100),
    email: str | None = Query(default=None, max_length=320),
) -> dict:
    del user
    return ok(_service(db).list_users(limit=limit, email=email), request_id_of(request))


@router.patch("/users/{user_id}/roles", summary="Replace assigned roles — not self-serve")
def assign_roles(
    user_id: UUID,
    payload: RoleAssignmentRequest,
    request: Request,
    db: DbSession,
    user: Operator,
) -> dict:
    return ok(
        _service(db).assign_roles(
            actor=user,
            user_id=user_id,
            roles=payload.roles,
            request_id=request_id_of(request),
        ),
        request_id_of(request),
    )


@router.patch("/users/{user_id}", summary="Activate or deactivate an account")
def set_user_status(
    user_id: UUID,
    payload: UserStatusRequest,
    request: Request,
    db: DbSession,
    user: Operator,
) -> dict:
    return ok(
        _service(db).set_active(
            actor=user,
            user_id=user_id,
            is_active=payload.is_active,
            request_id=request_id_of(request),
        ),
        request_id_of(request),
    )


@router.get("/audit", summary="Recent audit rows — no secrets")
def list_audit(
    request: Request,
    db: DbSession,
    user: Operator,
    limit: int = Query(default=40, ge=1, le=100),
    action: str | None = Query(default=None, max_length=32),
) -> dict:
    del user
    return ok(_service(db).list_audit(limit=limit, action=action), request_id_of(request))


@router.get("/flags", summary="Feature flags from the environment — not a runtime toggle")
def list_flags(request: Request, db: DbSession, user: Operator) -> dict:
    del user
    return ok(_service(db).flags(), request_id_of(request))
