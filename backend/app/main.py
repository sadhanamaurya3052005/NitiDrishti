"""NitiDrishti backend entrypoint.

Run locally:  uvicorn app.main:app --reload
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.error_handlers import register_error_handlers
from app.api.router import api_router
from app.config import get_settings, settings
from app.core.database import check_connection
from app.core.logging import configure_logging, get_logger
from app.core.middleware import RateLimitMiddleware, RequestIdMiddleware, SecurityHeadersMiddleware
from app.services.ingestion.scheduler import start_background_scheduler, stop_background_scheduler

configure_logging()
log = get_logger("nitidrishti")


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_settings.cache_clear()
    db = check_connection()
    log.info(
        "startup",
        app=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
        database_connected=db["connected"],
        postgis=db["postgis_enabled"],
    )
    if not db["connected"]:
        log.warning(
            "database_unreachable",
            hint="Start local PostgreSQL 18 (native), or set DATABASE_URL in .env",
        )
    app.state.ingest_scheduler = start_background_scheduler()
    yield
    stop_background_scheduler(getattr(app.state, "ingest_scheduler", None))
    log.info("shutdown", app=settings.app_name)


def create_app() -> FastAPI:
    app = FastAPI(
        title=f"{settings.app_name} API",
        description=(
            "Welfare and opportunity intelligence built on our own ingestion of official "
            "government sources. No third-party data APIs."
        ),
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
    register_error_handlers(app)
    app.include_router(api_router)
    return app


app = create_app()
