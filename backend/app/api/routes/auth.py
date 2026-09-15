"""JWT register / login / logout / me, plus DPDP profile update and purge.

Guest (unauthenticated) callers receive AUTH_ERROR and never insert rows.
"""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.core.deps import CurrentAuthService, CurrentUser, request_id_of
from app.schemas.auth import LoginRequest, ProfileUpdateRequest, RefreshRequest, RegisterRequest
from app.schemas.envelope import ok
from app.services.auth.service import to_public

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register")
def register(payload: RegisterRequest, request: Request, service: CurrentAuthService) -> dict:
    bundle = service.register(payload, request_id=request_id_of(request))
    return ok(bundle.model_dump(mode="json"), request_id_of(request))


@router.post("/login")
def login(payload: LoginRequest, request: Request, service: CurrentAuthService) -> dict:
    bundle = service.login(payload, request_id=request_id_of(request))
    return ok(bundle.model_dump(mode="json"), request_id_of(request))


@router.post("/refresh")
def refresh(payload: RefreshRequest, request: Request, service: CurrentAuthService) -> dict:
    bundle = service.refresh(payload.refresh_token)
    return ok(bundle.model_dump(mode="json"), request_id_of(request))


@router.post("/logout")
def logout(request: Request, user: CurrentUser, service: CurrentAuthService) -> dict:
    return ok(service.logout(user, request_id=request_id_of(request)), request_id_of(request))


@router.get("/me")
def me(request: Request, user: CurrentUser) -> dict:
    return ok(to_public(user).model_dump(mode="json"), request_id_of(request))


@router.patch("/profile")
def update_profile(
    payload: ProfileUpdateRequest,
    request: Request,
    user: CurrentUser,
    service: CurrentAuthService,
) -> dict:
    public = service.update_profile(user, payload, request_id=request_id_of(request))
    return ok(public.model_dump(mode="json"), request_id_of(request))


@router.delete("/account")
def delete_account(request: Request, user: CurrentUser, service: CurrentAuthService) -> dict:
    return ok(service.purge_account(user, request_id=request_id_of(request)), request_id_of(request))
