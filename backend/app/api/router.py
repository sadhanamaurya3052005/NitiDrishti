"""Root API router.

Feature routers are registered here so `main.py` never grows.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import (
    admin,
    alerts,
    analytics,
    applications,
    assistant,
    auth,
    disaster,
    dossiers,
    eligibility,
    health,
    ocr,
    opportunities,
    policies,
    review,
    schemes,
    search,
    sources,
    updates,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(schemes.router)
api_router.include_router(review.router)
api_router.include_router(search.router)
api_router.include_router(eligibility.router)
api_router.include_router(dossiers.router)
api_router.include_router(applications.router)
api_router.include_router(sources.router)
api_router.include_router(updates.router)
api_router.include_router(opportunities.router)
api_router.include_router(policies.router)
api_router.include_router(alerts.router)
api_router.include_router(analytics.router)
api_router.include_router(assistant.router)
api_router.include_router(ocr.router)
api_router.include_router(admin.router)
api_router.include_router(disaster.router)
