"""Database engine, session factory and declarative base.

Phase 0 defines the connection only. Tables arrive in Phase 2 via Alembic.
"""

from __future__ import annotations

from collections.abc import Generator
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    echo=False,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """Declarative base for every ORM model in the project."""


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a scoped session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_connection() -> dict[str, Any]:
    """Lightweight connectivity probe used by the health endpoint."""
    try:
        with engine.connect() as connection:
            version = connection.execute(text("SELECT version()")).scalar_one()
            postgis = connection.execute(
                text("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis')")
            ).scalar_one()
        return {
            "connected": True,
            "server": str(version).split(" on ")[0],
            "postgis_enabled": bool(postgis),
            "error": None,
        }
    except Exception as exc:
        return {
            "connected": False,
            "server": None,
            "postgis_enabled": False,
            "error": type(exc).__name__,
        }
