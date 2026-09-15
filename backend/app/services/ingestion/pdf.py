"""Text PDF connector. Scanned/OCR PDFs are a separate pipeline."""

from __future__ import annotations

from io import BytesIO

from pypdf import PdfReader

from app.core.exceptions import ValidationError
from app.services.ingestion.base import SourceConnector
from app.services.ingestion.payload import ParsedDocument, RawPayload


class PdfConnector(SourceConnector):
    connector_type = "pdf"

    def parse(self, payload: RawPayload) -> ParsedDocument:
        try:
            reader = PdfReader(BytesIO(payload.content))
        except Exception as exc:
            raise ValidationError(f"Not a readable text PDF: {type(exc).__name__}") from exc

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
        return ParsedDocument(payload=payload, title=title, text=text)
