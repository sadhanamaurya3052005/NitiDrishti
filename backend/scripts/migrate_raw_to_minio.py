"""One-time filesystem RAW → MinIO migration with SHA-256 verify.

Does not delete local snapshots. Skips keys that already exist in the bucket.
Requires MINIO_ENDPOINT (and credentials) in the environment.
"""

from __future__ import annotations

import hashlib
import os
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

os.environ.pop("CURL_CA_BUNDLE", None)

from app.config import settings  # noqa: E402
from app.core.logging import configure_logging, get_logger  # noqa: E402
from app.services.ingestion.object_store import MinioObjectStore, minio_enabled  # noqa: E402
from app.services.ingestion.snapshot import raw_root  # noqa: E402

log = get_logger("nitidrishti.migrate_raw_minio")


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def migrate(*, dry_run: bool = False) -> dict:
    if not minio_enabled():
        return {"status": "failed", "reason": "MINIO_ENDPOINT not configured"}

    root = raw_root()
    if not root.exists():
        return {"status": "ok", "uploaded": 0, "skipped": 0, "note": "no local RAW tree"}

    store = MinioObjectStore(
        endpoint=settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        bucket=settings.minio_bucket,
        secure=bool(settings.minio_secure),
    )

    uploaded = 0
    skipped = 0
    mismatched = 0
    errors: list[str] = []

    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        key = path.relative_to(root).as_posix()
        local_hash = _sha256(path)
        # Content-addressable keys already embed sha256; still verify after put.
        if store.exists(key):
            try:
                remote = store.get_bytes(key)
                remote_hash = hashlib.sha256(remote).hexdigest()
                if remote_hash != local_hash:
                    mismatched += 1
                    errors.append(f"hash_mismatch:{key}")
                else:
                    skipped += 1
            except Exception as exc:
                errors.append(f"read_failed:{key}:{type(exc).__name__}")
            continue
        if dry_run:
            uploaded += 1
            continue
        data = path.read_bytes()
        if hashlib.sha256(data).hexdigest() != local_hash:
            errors.append(f"local_read_race:{key}")
            continue
        content_type = "application/octet-stream"
        if key.endswith(".html"):
            content_type = "text/html"
        elif key.endswith(".pdf"):
            content_type = "application/pdf"
        elif key.endswith(".json"):
            content_type = "application/json"
        stored = store.put_bytes(key, data, content_type=content_type)
        remote = store.get_bytes(key)
        if hashlib.sha256(remote).hexdigest() != local_hash:
            mismatched += 1
            errors.append(f"post_put_mismatch:{key}")
        else:
            uploaded += 1
            log.info("raw_migrated", key=key, uri=stored.uri)

    status = "ok" if not errors else "partial"
    return {
        "status": status,
        "uploaded": uploaded,
        "skipped": skipped,
        "mismatched": mismatched,
        "errors": errors[:50],
        "bucket": settings.minio_bucket,
        "dry_run": dry_run,
    }


def main() -> int:
    configure_logging()
    dry = "--dry-run" in sys.argv
    result = migrate(dry_run=dry)
    print(result)
    return 0 if result.get("status") in {"ok", "partial"} and result.get("mismatched", 0) == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
