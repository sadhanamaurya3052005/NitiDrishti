"""Text PDF connector. Thin/scanned PDFs optionally go through local Tesseract."""

from __future__ import annotations

from io import BytesIO

from pypdf import PdfReader

from app.config import settings
from app.core.exceptions import ValidationError
from app.services.ingestion.base import SourceConnector
from app.services.ingestion.ocr import ocr_scanned_document, text_is_thin
from app.services.ingestion.payload import ParsedDocument, RawPayload


class PdfConnector(SourceConnector):
    connector_type = "pdf"

    def parse(self, payload: RawPayload) -> ParsedDocument:
        try:
            reader = PdfReader(BytesIO(payload.content))
        except Exception as exc:
            raise ValidationError(f"Not a readable text PDF: {type(exc).__name__}") from exc
        if reader.is_encrypted:
            raise ValidationError("Password-protected PDF refused")

        pages: list[str] = []
        for page in reader.pages:
            pages.append(page.extract_text() or "")
        text = "\n".join(pages).strip()
        title = None
        if reader.metadata and reader.metadata.title:
            title = str(reader.metadata.title).strip() or None
        if not title:
            first_line = next((line.strip() for line in text.splitlines() if line.strip()), None)
            title = first_line
        ocr_confidence = None
        ocr_engine = None
        if settings.feature_ai_extraction and text_is_thin(text):
            ocr = ocr_scanned_document(payload.content, mime_type=payload.mime_type)
            ocr_engine = ocr.engine
            if ocr.available and ocr.text.strip():
                text = ocr.text.strip()
                ocr_confidence = ocr.confidence
                if not title:
                    title = next((line.strip() for line in text.splitlines() if line.strip()), None)
            elif ocr.reason:
                ocr_engine = ocr.engine or "unavailable"
        return ParsedDocument(
            payload=payload,
            title=title,
            text=text,
            ocr_confidence=ocr_confidence,
            ocr_engine=ocr_engine,
        )
