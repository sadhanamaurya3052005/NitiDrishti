"""Deterministic failure taxonomy for ingestion logs / dead-letter views."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass

from app.core.exceptions import AppError

# Explicit classes — do not invent success from failure.
FAILURE_CLASSES = frozenset(
    {
        "FETCH_FAILED",
        "ROBOTS_DENIED",
        "HTTP_4XX",
        "HTTP_5XX",
        "TLS_FAILED",
        "PARSE_FAILED",
        "OCR_FAILED",
        "NORMALIZATION_FAILED",
        "QUALITY_FAILED",
        "RULE_VALIDATION_FAILED",
        "PROVENANCE_FAILED",
        "DB_WRITE_FAILED",
        "PUBLISH_BLOCKED",
        "SOURCE_INACTIVE",
        "UNKNOWN_FAILED",
    }
)


@dataclass(frozen=True)
class FailureInfo:
    failure_class: str
    retryable: bool
    failure_stage: str
    error_code: str
    message: str


def classify_exception(exc: BaseException, *, stage: str = "ingestion") -> FailureInfo:
    if isinstance(exc, AppError):
        return classify_app_error(exc.code, exc.message, stage=stage)
    name = type(exc).__name__
    if "SSL" in name or "TLS" in name:
        return FailureInfo("TLS_FAILED", True, stage, "TLS_FAILED", name)
    return FailureInfo("UNKNOWN_FAILED", False, stage, "INTERNAL_ERROR", name)


def classify_app_error(code: str | None, detail: str | None, *, stage: str = "ingestion") -> FailureInfo:
    text = f"{code or ''} {detail or ''}".strip()
    lowered = text.lower()
    if code == "SOURCE_INACTIVE" or "inactive" in lowered:
        return FailureInfo("SOURCE_INACTIVE", False, "source_registry", "SOURCE_INACTIVE", detail or text)
    if "robots" in lowered:
        return FailureInfo("ROBOTS_DENIED", False, "fetch", code or "SOURCE_UNAVAILABLE", detail or text)
    if "ssl" in lowered or "tls" in lowered:
        return FailureInfo("TLS_FAILED", True, "fetch", code or "SOURCE_UNAVAILABLE", detail or text)
    http = _http_status(detail or "")
    if http is not None:
        if 400 <= http < 500:
            return FailureInfo(
                "HTTP_4XX",
                http in {408, 429},
                "fetch",
                code or "SOURCE_UNAVAILABLE",
                detail or text,
            )
        if http >= 500:
            return FailureInfo("HTTP_5XX", True, "fetch", code or "SOURCE_UNAVAILABLE", detail or text)
    if code == "VALIDATION_ERROR" or (isinstance(detail, str) and "ast" in lowered):
        if "ast" in lowered or "rule" in lowered:
            return FailureInfo("RULE_VALIDATION_FAILED", False, "validation", code or "VALIDATION_ERROR", detail or text)
        if "provenance" in lowered or "source_url" in lowered:
            return FailureInfo("PROVENANCE_FAILED", False, "validation", code or "VALIDATION_ERROR", detail or text)
        return FailureInfo("QUALITY_FAILED", False, "quality", code or "VALIDATION_ERROR", detail or text)
    if "parse" in lowered or "pdf" in lowered or ("html" in lowered and "malformed" in lowered):
        return FailureInfo("PARSE_FAILED", False, "parse_ocr", code or "PARSE_FAILED", detail or text)
    if "ocr" in lowered:
        return FailureInfo("OCR_FAILED", False, "parse_ocr", code or "OCR_FAILED", detail or text)
    if code == "SOURCE_UNAVAILABLE":
        return FailureInfo("FETCH_FAILED", True, "fetch", code, detail or text)
    if code == "INTERNAL_ERROR":
        return FailureInfo("UNKNOWN_FAILED", False, stage, code, detail or text)
    return FailureInfo("UNKNOWN_FAILED", False, stage, code or "UNKNOWN_FAILED", detail or text)


def classify_from_log(*, error_code: str | None, detail: str | None, http_status: int | None = None) -> FailureInfo:
    if http_status is not None and http_status >= 400:
        return classify_app_error(error_code, detail or f"HTTP {http_status}")
    # Prefer structured JSON detail from inactive skip.
    if detail and detail.strip().startswith("{"):
        try:
            payload = json.loads(detail)
            if payload.get("stage") == "inactive_skip":
                return FailureInfo(
                    "SOURCE_INACTIVE",
                    False,
                    "source_registry",
                    error_code or "SOURCE_INACTIVE",
                    detail,
                )
        except json.JSONDecodeError:
            pass
    return classify_app_error(error_code, detail)


def _http_status(detail: str) -> int | None:
    match = re.search(r"HTTP\s+(\d{3})", detail, flags=re.I)
    if not match:
        return None
    return int(match.group(1))
