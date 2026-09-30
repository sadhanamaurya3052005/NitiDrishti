"""Filesystem object store idempotency (no MinIO required)."""

from __future__ import annotations

from pathlib import Path

from app.services.ingestion.object_store import FilesystemObjectStore


def test_filesystem_put_is_idempotent(tmp_path: Path) -> None:
    store = FilesystemObjectStore(tmp_path)
    key = "src/2026-01-01/abcd.html"
    first = store.put_bytes(key, b"<html>ok</html>", content_type="text/html")
    second = store.put_bytes(key, b"<html>DIFFERENT</html>", content_type="text/html")
    assert first.created is True
    assert second.created is False
    assert store.get_bytes(key) == b"<html>ok</html>"
    assert first.backend == "filesystem"
