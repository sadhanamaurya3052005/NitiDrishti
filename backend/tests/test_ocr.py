"""Scanned gazette OCR is optional, fail-closed, and never an LLM vote."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi.testclient import TestClient

from app.main import app
from app.services.ingestion.extractors import extract_schemes
from app.services.ingestion.hashing import sha256_bytes
from app.services.ingestion.ocr import OcrResult, text_is_thin
from app.services.ingestion.payload import ParsedDocument, RawPayload, SourceSpec
from app.services.ingestion.pdf import PdfConnector
from tests.test_ingestion_parse import _PDF, _payload


def test_ready_exposes_ocr_status() -> None:
    flags = TestClient(app).get("/ready").json()["flags"]
    assert "ocr" in flags
    assert isinstance(flags["ocr"]["available"], bool)
    assert flags["disaster_module"] is False


def test_guest_cannot_preview_ocr() -> None:
    denied = TestClient(app).post(
        "/api/v1/ocr/preview",
        files={"file": ("gazette.png", b"not-an-image", "image/png")},
    )
    assert denied.status_code == 401
    assert denied.json()["error"]["code"] == "AUTH_ERROR"


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
