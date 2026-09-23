"""Readiness probes used by GET /ready. Health stays a separate flat payload."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from app.config import settings
from app.core.database import check_connection
from app.services.ingestion.scheduler import scheduler_should_run


def _ocr_flag() -> dict[str, Any]:
    try:
        from app.services.ingestion.ocr import tesseract_status

        return tesseract_status()
    except Exception as exc:
        return {"available": False, "engine": None, "reason": type(exc).__name__}


def check_storage() -> dict[str, Any]:
    path = Path(settings.raw_storage_path)
    try:
        path.mkdir(parents=True, exist_ok=True)
        writable = path.is_dir()
        return {"ok": writable, "path": str(path), "error": None if writable else "not_a_directory"}
    except OSError as exc:
        return {"ok": False, "path": str(path), "error": type(exc).__name__}


def readiness_payload() -> dict[str, Any]:
    database = check_connection()
    storage = check_storage()
    ready = bool(database["connected"] and storage["ok"])
    return {
        "status": "ready" if ready else "not_ready",
        "app": settings.app_name,
        "version": settings.app_version,
        "environment": settings.app_env,
        "database": {
            "connected": database["connected"],
            "error": database["error"],
        },
        "storage": storage,
        "ingestion_scheduler": scheduler_should_run(),
        "flags": {
            "ai_extraction": settings.feature_ai_extraction,
            "ocr": _ocr_flag(),
            "disaster_module": settings.feature_disaster_module,
            "what_if_api": settings.feature_what_if_api,
        },
    }
