"""Local Tesseract OCR for scanned gazettes. Optional deps; no LLM; no persistence."""

from __future__ import annotations

import io
import shutil
from dataclasses import dataclass

from app.config import settings
from app.core.security import scrub_identifier_digits

_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/tiff"}
_PDF_TYPES = {"application/pdf"}


def _cfg(name: str, default: object) -> object:
    """Pydantic Settings raises on missing fields; never use getattr()."""
    try:
        value = settings.model_dump().get(name, default)
    except Exception:
        return default
    return default if value is None else value

_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/tiff"}
_PDF_TYPES = {"application/pdf"}


@dataclass(frozen=True)
class OcrResult:
    available: bool
    engine: str | None
    text: str
    confidence: float | None
    pages: int
    reason: str | None = None

    def as_api(self) -> dict:
        return {
            "available": self.available,
            "engine": self.engine,
            "text": self.text,
            "confidence": self.confidence,
            "pages": self.pages,
            "reason": self.reason,
            "persisted": False,
        }


def tesseract_status() -> dict[str, object]:
    cmd = str(_cfg("tesseract_cmd", "tesseract") or "tesseract").strip() or "tesseract"
    path = shutil.which(cmd)
    try:
        import pytesseract  # noqa: F401
        from PIL import Image  # noqa: F401
    except ImportError:
        return {
            "available": False,
            "engine": None,
            "cmd": cmd,
            "reason": "pytesseract/Pillow not installed",
        }
    if path is None:
        return {
            "available": False,
            "engine": None,
            "cmd": cmd,
            "reason": "Tesseract binary not on PATH",
        }
    return {"available": True, "engine": "tesseract", "cmd": path, "reason": None}


def text_is_thin(text: str) -> bool:
    compact = "".join(ch for ch in (text or "") if ch.isalnum())
    minimum = int(_cfg("ocr_min_text_chars", 12) or 12)
    return len(compact) < max(1, minimum)


def ocr_scanned_document(content: bytes, *, mime_type: str | None, filename: str | None = None) -> OcrResult:
    """Rasterize a scanned gazette (PDF or image) and run Tesseract. Never writes rows."""
    status = tesseract_status()
    if not status["available"]:
        return OcrResult(
            available=False,
            engine=None,
            text="",
            confidence=None,
            pages=0,
            reason=str(status["reason"]),
        )
    kind = _kind(mime_type, filename)
    if kind == "image":
        return _ocr_images([content])
    if kind == "pdf":
        pages = _render_pdf_pages(content)
        if not pages:
            return OcrResult(
                available=False,
                engine="tesseract",
                text="",
                confidence=None,
                pages=0,
                reason="pymupdf not installed; cannot rasterize a scanned PDF",
            )
        return _ocr_images(pages)
    return OcrResult(
        available=False,
        engine="tesseract",
        text="",
        confidence=None,
        pages=0,
        reason="Unsupported file type for OCR (PDF or image only)",
    )


def _kind(mime_type: str | None, filename: str | None) -> str | None:
    mime = (mime_type or "").split(";")[0].strip().lower()
    name = (filename or "").lower()
    if mime in _IMAGE_TYPES or name.endswith((".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff")):
        return "image"
    if mime in _PDF_TYPES or name.endswith(".pdf"):
        return "pdf"
    return None


def _render_pdf_pages(content: bytes) -> list[bytes]:
    try:
        import fitz
    except ImportError:
        return []
    doc = fitz.open(stream=content, filetype="pdf")
    images: list[bytes] = []
    try:
        limit = max(1, int(_cfg("ocr_max_pages", 4) or 4))
        for index, page in enumerate(doc):
            if index >= limit:
                break
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            images.append(pix.tobytes("png"))
    finally:
        doc.close()
    return images


def _ocr_images(pages: list[bytes]) -> OcrResult:
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        return OcrResult(
            available=False,
            engine=None,
            text="",
            confidence=None,
            pages=0,
            reason="pytesseract/Pillow not installed",
        )
    cmd = str(_cfg("tesseract_cmd", "tesseract") or "tesseract").strip()
    if cmd:
        pytesseract.pytesseract.tesseract_cmd = cmd
    texts: list[str] = []
    confs: list[float] = []
    for raw in pages:
        image = Image.open(io.BytesIO(raw))
        if image.mode not in {"L", "RGB"}:
            image = image.convert("RGB")
        payload = pytesseract.image_to_data(
            image,
            lang=str(_cfg("ocr_languages", "eng+hin") or "eng+hin"),
            output_type=pytesseract.Output.DICT,
        )
        words = [
            str(word)
            for word, conf in zip(payload.get("text", []), payload.get("conf", []), strict=False)
            if str(word).strip()
        ]
        texts.append(" ".join(words))
        numeric = []
        for conf in payload.get("conf", []):
            try:
                value = float(conf)
            except (TypeError, ValueError):
                continue
            if value >= 0:
                numeric.append(value / 100.0)
        if numeric:
            confs.append(sum(numeric) / len(numeric))
    text = scrub_identifier_digits("\n".join(texts).strip()) or ""
    confidence = round(sum(confs) / len(confs), 2) if confs else None
    return OcrResult(
        available=True,
        engine="tesseract",
        text=text,
        confidence=confidence,
        pages=len(pages),
        reason=None,
    )
