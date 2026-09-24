"""Scanned gazette OCR is optional, fail-closed, and never an LLM vote."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.ingestion.extractors import extract_schemes
from app.services.ingestion.hashing import sha256_bytes
from app.services.ingestion.ocr import (
    OcrResult,
    ocr_scanned_document,
    tesseract_status,
    text_is_thin,
)
from app.services.ingestion.payload import ParsedDocument, RawPayload, SourceSpec
from app.services.ingestion.pdf import PdfConnector
from tests.test_ingestion_parse import _PDF, _payload
from tests.test_rbac_access import _cleanup, _db_ready, _email, _grant, _register

# Isolated 1x1 PNG fixture (not production data).
_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
    b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)

_OCR_STATUSES = {"available", "not_configured", "unavailable"}


def test_ready_exposes_ocr_status() -> None:
    flags = TestClient(app).get("/ready").json()["flags"]
    assert "ocr" in flags
    assert isinstance(flags["ocr"]["available"], bool)
    assert flags["ocr"]["optional"] is True
    assert flags["ocr"]["status"] in _OCR_STATUSES
    assert flags["ocr"]["available"] is (flags["ocr"]["status"] == "available")
    assert flags["disaster_module"] is False


def test_tesseract_status_requires_binary_not_just_python_imports(monkeypatch) -> None:
    monkeypatch.setattr("app.services.ingestion.ocr.shutil.which", lambda _cmd: None)
    status = tesseract_status()
    assert status["available"] is False
    assert status["optional"] is True
    assert status["status"] == "not_configured"
    assert status["reason"] in {
        "pytesseract/Pillow not installed",
        "Tesseract binary not on PATH",
    }


def test_tesseract_status_available_only_with_imports_and_binary(monkeypatch) -> None:
    monkeypatch.setattr("app.services.ingestion.ocr.shutil.which", lambda _cmd: "tesseract")
    status = tesseract_status()
    extras = True
    try:
        import pytesseract  # noqa: F401
        from PIL import Image  # noqa: F401
    except ImportError:
        extras = False
    if extras:
        assert status["available"] is True
        assert status["status"] == "available"
        assert status["engine"] == "tesseract"
        assert status["cmd"] == "tesseract"
    else:
        assert status["available"] is False
        assert status["status"] == "not_configured"
        assert status["reason"] == "pytesseract/Pillow not installed"


def test_guest_cannot_preview_ocr() -> None:
    denied = TestClient(app).post(
        "/api/v1/ocr/preview",
        files={"file": ("gazette.png", b"not-an-image", "image/png")},
    )
    assert denied.status_code == 401
    assert denied.json()["error"]["code"] == "AUTH_ERROR"
    assert "traceback" not in denied.text.lower()


def test_ocr_scanned_png_matches_capability() -> None:
    result = ocr_scanned_document(_PNG, mime_type="image/png", filename="fixture.png")
    status = tesseract_status()
    payload = result.as_api()
    assert payload["persisted"] is False
    if status["available"]:
        assert payload["available"] is True
        assert payload["engine"] == "tesseract"
        assert payload["pages"] == 1
        assert payload["reason"] is None
    else:
        assert payload["available"] is False
        assert payload["text"] == ""
        assert payload["reason"] == status["reason"]


def test_ocr_invalid_type_stays_fail_closed() -> None:
    result = ocr_scanned_document(b"not-a-gazette", mime_type="text/plain", filename="notes.txt")
    payload = result.as_api()
    assert payload["available"] is False
    assert payload["persisted"] is False
    assert payload["reason"]


def test_officer_preview_missing_file_is_422() -> None:
    if not _db_ready():
        pytest.skip("PostgreSQL production schema is not available")
    email = _email("ocr-missing")
    client = TestClient(app, raise_server_exceptions=False)
    try:
        token = _register(client, email)
        _grant(email, "WELFARE_OFFICER")
        missing = client.post("/api/v1/ocr/preview", headers={"Authorization": f"Bearer {token}"})
        assert missing.status_code == 422
        body = missing.json()
        assert body["success"] is False
        assert body["error"]["code"] == "VALIDATION_ERROR"
        assert "traceback" not in missing.text.lower()
    finally:
        _cleanup(email)


def test_officer_preview_png_and_invalid_use_envelope() -> None:
    if not _db_ready():
        pytest.skip("PostgreSQL production schema is not available")
    email = _email("ocr-officer")
    client = TestClient(app, raise_server_exceptions=False)
    try:
        token = _register(client, email)
        _grant(email, "WELFARE_OFFICER")
        headers = {"Authorization": f"Bearer {token}"}
        png = client.post(
            "/api/v1/ocr/preview",
            headers=headers,
            files={"file": ("fixture.png", _PNG, "image/png")},
        )
        assert png.status_code == 200, png.text
        body = png.json()
        assert body["success"] is True
        assert body["error"] is None
        data = body["data"]
        assert data["persisted"] is False
        assert isinstance(data["available"], bool)
        assert data["available"] is tesseract_status()["available"]
        if not data["available"]:
            assert data["text"] == ""
            assert data["reason"]
        invalid = client.post(
            "/api/v1/ocr/preview",
            headers=headers,
            files={"file": ("notes.txt", b"hello", "text/plain")},
        )
        assert invalid.status_code == 200, invalid.text
        bad = invalid.json()
        assert bad["success"] is True
        assert bad["data"]["available"] is False
        assert bad["data"]["reason"]
        assert "traceback" not in invalid.text.lower()
        assert "secret" not in invalid.text.lower()
    finally:
        _cleanup(email)


def test_text_pdf_skips_ocr_when_extraction_is_on(monkeypatch) -> None:
    monkeypatch.setattr("app.services.ingestion.pdf.settings.feature_ai_extraction", True)

    def boom(*_args, **_kwargs):
        raise AssertionError("text PDFs must not invoke Tesseract")

    monkeypatch.setattr("app.services.ingestion.pdf.ocr_scanned_document", boom)
    parsed = PdfConnector().parse(_payload("https://vikaspedia.in/pmkisan.pdf", _PDF, "application/pdf"))
    assert "PM-KISAN" in parsed.text
    assert parsed.ocr_confidence is None


def test_thin_pdf_uses_ocr_text_and_confidence(monkeypatch) -> None:
    monkeypatch.setattr("app.services.ingestion.pdf.settings.feature_ai_extraction", True)
    monkeypatch.setattr(
        "app.services.ingestion.pdf.ocr_scanned_document",
        lambda *_args, **_kwargs: OcrResult(
            available=True,
            engine="tesseract",
            text="PM-Kisan scanned gazette income support Rs. 6000 per year for landholding families.",
            confidence=0.81,
            pages=1,
        ),
    )
    thin = _PDF.replace(
        b"PM-KISAN income support Rs. 6000 per year",
        b"x                                          ",
    )
    parsed = PdfConnector().parse(_payload("https://vikaspedia.in/scan.pdf", thin, "application/pdf"))
    assert parsed.ocr_engine == "tesseract"
    assert parsed.ocr_confidence == 0.81
    assert "PM-Kisan" in parsed.text


def test_low_ocr_confidence_forces_needs_review() -> None:
    payload = RawPayload(
        url="https://vikaspedia.in/scan",
        final_url="https://vikaspedia.in/scan",
        status_code=200,
        mime_type="application/pdf",
        content=b"x",
        retrieved_at=datetime.now(UTC),
        content_hash=sha256_bytes(b"x"),
    )
    parsed = ParsedDocument(
        payload=payload,
        title="PM-Kisan scanned gazette page",
        text=(
            "PM-Kisan provides income support of Rs. 6000 per year to landholding farmer families. "
            "The official gazette lists eligibility, documents and the benefit ceiling in detail. "
            "This paragraph exists so the extractor treats the page as substantial official text."
        ),
        ocr_confidence=0.22,
        ocr_engine="tesseract",
    )
    spec = SourceSpec(
        name="PM-Kisan",
        url="https://vikaspedia.in/scan",
        connector_type="pdf",
        category="agriculture",
        slug="pm-kisan-ocr",
    )
    schemes = extract_schemes(parsed, spec)
    assert schemes
    assert schemes[0].status == "needs_review"
    assert schemes[0].confidence <= 0.22


def test_thin_text_threshold() -> None:
    assert text_is_thin("   ")
    assert text_is_thin("x")
    assert not text_is_thin("PM-Kisan income support")
