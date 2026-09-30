"""Object storage for RAW snapshots. MinIO/S3 when configured; filesystem otherwise."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.config import settings
from app.core.logging import get_logger

log = get_logger("nitidrishti.object_store")


@dataclass(frozen=True)
class StoredObject:
    key: str
    uri: str
    backend: str  # "minio" | "filesystem"
    created: bool


class ObjectStore(Protocol):
    def put_bytes(self, key: str, data: bytes, *, content_type: str) -> StoredObject: ...

    def exists(self, key: str) -> bool: ...

    def get_bytes(self, key: str) -> bytes: ...


class FilesystemObjectStore:
    def __init__(self, root) -> None:
        from pathlib import Path

        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def put_bytes(self, key: str, data: bytes, *, content_type: str) -> StoredObject:
        path = self.root / key
        path.parent.mkdir(parents=True, exist_ok=True)
        created = not path.exists()
        if created:
            path.write_bytes(data)
        return StoredObject(key=key, uri=str(path.as_posix()), backend="filesystem", created=created)

    def exists(self, key: str) -> bool:
        return (self.root / key).exists()

    def get_bytes(self, key: str) -> bytes:
        return (self.root / key).read_bytes()


class MinioObjectStore:
    def __init__(
        self,
        *,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket: str,
        secure: bool = False,
    ) -> None:
        from minio import Minio

        host = endpoint.replace("https://", "").replace("http://", "")
        self.client = Minio(host, access_key=access_key, secret_key=secret_key, secure=secure)
        self.bucket = bucket
        if not self.client.bucket_exists(bucket):
            self.client.make_bucket(bucket)

    def put_bytes(self, key: str, data: bytes, *, content_type: str) -> StoredObject:
        from io import BytesIO

        created = not self.exists(key)
        if created:
            self.client.put_object(
                self.bucket,
                key,
                BytesIO(data),
                length=len(data),
                content_type=content_type or "application/octet-stream",
            )
        return StoredObject(
            key=key,
            uri=f"s3://{self.bucket}/{key}",
            backend="minio",
            created=created,
        )

    def exists(self, key: str) -> bool:
        try:
            self.client.stat_object(self.bucket, key)
            return True
        except Exception:
            return False

    def get_bytes(self, key: str) -> bytes:
        response = self.client.get_object(self.bucket, key)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()


def minio_enabled() -> bool:
    return bool(getattr(settings, "minio_endpoint", "") and getattr(settings, "minio_bucket", ""))


def get_object_store() -> ObjectStore:
    if minio_enabled():
        try:
            return MinioObjectStore(
                endpoint=settings.minio_endpoint,
                access_key=settings.minio_access_key,
                secret_key=settings.minio_secret_key,
                bucket=settings.minio_bucket,
                secure=bool(settings.minio_secure),
            )
        except Exception as exc:
            log.warning("minio_unavailable_falling_back_filesystem", error=type(exc).__name__)
    from app.services.ingestion.snapshot import raw_root

    return FilesystemObjectStore(raw_root())
