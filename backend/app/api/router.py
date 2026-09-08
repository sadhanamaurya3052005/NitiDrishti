"""Root API router.

Feature routers are registered here as each phase adds them, so `main.py`
never grows.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import health

api_router = APIRouter()
api_router.include_router(health.router)

# Registered in later phases:
#   Phase 4  -> auth, users
#   Phase 6  -> sources (admin + public status)
#   Phase 7  -> schemes
#   Phase 8  -> updates
#   Phase 9  -> search
#   Phase 10 -> eligibility
#   Phase 11 -> compare, documents, dossier
#   Phase 12 -> scholarships, jobs, internships, opportunities
#   Phase 13 -> policies (Nyay-Mitra)
#   Phase 14 -> policy changes / impact
#   Phase 15 -> alerts
#   Phase 16 -> csc, analytics
#   Phase 17 -> assistant, semantic search
