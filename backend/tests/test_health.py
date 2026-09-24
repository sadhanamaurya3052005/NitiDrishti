"""Smoke tests: the app boots and reports its own state honestly."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import settings
from app.core.database import check_connection
from app.core.ready import check_storage, readiness_payload
from app.main import app
from app.services.ingestion.hashing import sha256_bytes
from app.services.ingestion.payload import RawPayload
from app.services.ingestion.snapshot import persist_snapshot

client = TestClient(app)

_OCR_STATUSES = {"available", "not_configured", "unavailable"}


def test_health_returns_payload() -> None:
    response = client.get("/health")
    assert response.status_code == 200

    body = response.json()
    assert body["app"] == "NitiDrishti"
    assert body["status"] in {"ok", "degraded"}
    assert "database" in body
    assert isinstance(body["database"]["connected"], bool)


def test_health_status_matches_database_state() -> None:
    body = client.get("/health").json()
    expected = "ok" if body["database"]["connected"] else "degraded"
    assert body["status"] == expected


def test_version_endpoint() -> None:
    response = client.get("/api/version")
    assert response.status_code == 200
    body = response.json()
    assert body["app"] == "NitiDrishti"
    assert "phase" not in body
    assert body["status"] == "production-ready core"


def test_openapi_schema_available() -> None:
    assert client.get("/openapi.json").status_code == 200


def test_ready_existing_storage_is_ok(monkeypatch, tmp_path: Path) -> None:
    storage = tmp_path / "raw"
    storage.mkdir()
    monkeypatch.setattr(settings, "raw_storage_path", str(storage))
    probe = check_storage()
    assert probe == {"ok": True, "path": str(storage), "error": None}
    body = TestClient(app).get("/ready").json()
    assert body["storage"]["ok"] is True
    assert body["storage"]["error"] is None
    db = check_connection()
    assert body["database"]["connected"] is db["connected"]
    expected = "ready" if db["connected"] else "not_ready"
    assert body["status"] == expected
    assert isinstance(body["ingestion_scheduler"], bool)
    ocr = body["flags"]["ocr"]
    assert ocr["optional"] is True
    assert ocr["status"] in _OCR_STATUSES
    assert ocr["available"] is (ocr["status"] == "available")


def test_ready_missing_storage_does_not_create_directory(monkeypatch, tmp_path: Path) -> None:
    missing = tmp_path / "absent-raw"
    monkeypatch.setattr(settings, "raw_storage_path", str(missing))
    assert not missing.exists()
    first = TestClient(app).get("/ready")
    second = TestClient(app).get("/ready")
    third = readiness_payload()
    assert first.status_code == 200
    assert second.status_code == 200
    for body in (first.json(), second.json(), third):
        assert body["storage"]["ok"] is False
        assert body["storage"]["error"] == "missing"
        assert body["status"] == "not_ready"
        assert "traceback" not in str(body).lower()
        assert body["flags"]["ocr"]["optional"] is True
        assert body["flags"]["ocr"]["status"] in _OCR_STATUSES
        assert isinstance(body["ingestion_scheduler"], bool)
        assert isinstance(body["database"]["connected"], bool)
    assert not missing.exists()
    assert list(tmp_path.iterdir()) == []


def test_ready_not_a_directory_is_reported(monkeypatch, tmp_path: Path) -> None:
    file_path = tmp_path / "not-a-dir"
    file_path.write_bytes(b"x")
    monkeypatch.setattr(settings, "raw_storage_path", str(file_path))
    probe = check_storage()
    assert probe["ok"] is False
    assert probe["error"] == "not_a_directory"
    assert file_path.is_file()


def test_ready_not_writable_is_reported_without_traceback(monkeypatch, tmp_path: Path) -> None:
    storage = tmp_path / "locked"
    storage.mkdir()
    monkeypatch.setattr(settings, "raw_storage_path", str(storage))
    monkeypatch.setattr("app.core.ready.os.access", lambda _path, _mode: False)
    body = TestClient(app, raise_server_exceptions=False).get("/ready").json()
    assert body["storage"]["ok"] is False
    assert body["storage"]["error"] == "not_writable"
    assert body["status"] == "not_ready"
    assert "traceback" not in str(body).lower()
    assert storage.is_dir()


def test_ready_storage_oserror_uses_error_type_only(monkeypatch, tmp_path: Path) -> None:
    target = tmp_path / "blocked"
    monkeypatch.setattr(settings, "raw_storage_path", str(target))

    def boom(_self: Path) -> bool:
        raise OSError("secret-storage-path")

    monkeypatch.setattr(Path, "exists", boom)
    probe = check_storage()
    assert probe["ok"] is False
    assert probe["error"] == "OSError"
    assert "secret-storage-path" not in str(probe)


def test_ingestion_snapshot_still_creates_raw_storage(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr("app.services.ingestion.snapshot.repo_root", lambda: tmp_path)
    monkeypatch.setattr(settings, "raw_storage_path", "./raw")
    payload = RawPayload(
        url="https://vikaspedia.in/x",
        final_url="https://vikaspedia.in/x",
        status_code=200,
        mime_type="text/html",
        content=b"<html>official</html>",
        retrieved_at=datetime.now(UTC),
        content_hash=sha256_bytes(b"<html>official</html>"),
    )
    persist_snapshot("src-1", payload)
    assert (tmp_path / "raw").is_dir()
