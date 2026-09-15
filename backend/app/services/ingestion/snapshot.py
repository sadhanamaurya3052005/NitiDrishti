"""Write raw snapshots under storage/raw/{source_id}/{date}/{hash}{ext}."""

from __future__ import annotations

from pathlib import Path

from app.config import settings
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


def persist_snapshot(source_id: str, payload: RawPayload) -> str:
    ext = _MIME_EXT.get(payload.mime_type.lower(), ".bin")
    day = payload.retrieved_at.date().isoformat()
    directory = raw_root() / source_id / day
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{payload.content_hash}{ext}"
    if not path.exists():
        path.write_bytes(payload.content)
    return str(path.relative_to(repo_root()).as_posix())
