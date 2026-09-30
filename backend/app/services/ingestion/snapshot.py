"""Write raw snapshots under source_id/YYYY-MM-DD/sha256.ext (MinIO or filesystem)."""

from __future__ import annotations

from pathlib import Path

from app.config import settings
from app.services.ingestion.object_store import get_object_store
from app.services.ingestion.payload import RawPayload

_MIME_EXT = {
    "text/html": ".html",
    "application/pdf": ".pdf",
    "application/json": ".json",
    "text/csv": ".csv",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
}


def repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def raw_root() -> Path:
    configured = Path(settings.raw_storage_path)
    if configured.is_absolute():
        return configured
    return repo_root() / configured.as_posix().lstrip("./")


def object_key(source_id: str, payload: RawPayload) -> str:
    ext = _MIME_EXT.get((payload.mime_type or "").lower(), ".bin")
    day = payload.retrieved_at.date().isoformat()
    return f"{source_id}/{day}/{payload.content_hash}{ext}"


def persist_snapshot(source_id: str, payload: RawPayload) -> str:
    """Idempotent RAW write. Never overwrites an existing identical object.

    Returns a storage reference:
    - s3://bucket/key when MinIO is active
    - relative filesystem path otherwise (legacy compatible)
    """
    key = object_key(source_id, payload)
    store = get_object_store()
    stored = store.put_bytes(key, payload.content, content_type=payload.mime_type or "application/octet-stream")
    if stored.backend == "minio":
        # Keep a local mirror for readiness / offline ops when configured.
        local = raw_root() / key
        local.parent.mkdir(parents=True, exist_ok=True)
        if not local.exists():
            local.write_bytes(payload.content)
        return stored.uri
    path = raw_root() / key
    return str(path.relative_to(repo_root()).as_posix())
