"""HTTP download primitive: timeout, size cap, retries. No robots check here."""

from __future__ import annotations

import time
from collections.abc import Callable
from datetime import UTC, datetime

import requests

from app.config import settings
from app.core.exceptions import SourceUnavailableError, ValidationError
from app.services.ingestion.hashing import sha256_bytes
from app.services.ingestion.payload import RawPayload
from app.services.ingestion.whitelist import assert_whitelisted

RetrieveFn = Callable[[str], RawPayload]


def _headers() -> dict[str, str]:
    return {
        "User-Agent": settings.ingestion_user_agent,
        "Accept": "text/html,application/xhtml+xml,application/pdf,text/csv,application/json,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-IN,en,hi;q=0.8",
    }


def _max_bytes() -> int:
    return max(1, settings.ingestion_max_file_mb) * 1024 * 1024


def download(url: str) -> RawPayload:
    """Fetch bytes from an already-whitelisted URL. Caller enforces robots.txt."""
    assert_whitelisted(url)
    last_error: Exception | None = None
    attempts = max(1, settings.ingestion_max_retries + 1)
    for attempt in range(attempts):
        try:
            return _download_once(url)
        except SourceUnavailableError:
            raise
        except ValidationError:
            raise
        except (requests.Timeout, requests.ConnectionError) as exc:
            last_error = exc
            time.sleep(min(8.0, 2**attempt))
    raise SourceUnavailableError(f"Could not retrieve {url}: {type(last_error).__name__}")


def _download_once(url: str) -> RawPayload:
    timeout = settings.ingestion_request_timeout
    try:
        response = requests.get(url, headers=_headers(), timeout=timeout, stream=True, allow_redirects=True)
    except requests.RequestException as exc:
        raise SourceUnavailableError(f"Request failed for {url}: {type(exc).__name__}") from exc

    final_url = str(response.url)
    assert_whitelisted(final_url)

    content_length = response.headers.get("Content-Length")
    if content_length and content_length.isdigit() and int(content_length) > _max_bytes():
        response.close()
        raise ValidationError(f"Remote file exceeds size cap ({settings.ingestion_max_file_mb} MB)")

    chunks: list[bytes] = []
    total = 0
    try:
        for chunk in response.iter_content(chunk_size=64 * 1024):
            if not chunk:
                continue
            total += len(chunk)
            if total > _max_bytes():
                raise ValidationError(f"Remote file exceeds size cap ({settings.ingestion_max_file_mb} MB)")
            chunks.append(chunk)
    finally:
        response.close()

    if response.status_code >= 400:
        raise SourceUnavailableError(f"HTTP {response.status_code} for {final_url}")

    content = b"".join(chunks)
    mime = (response.headers.get("Content-Type") or "application/octet-stream").split(";")[0].strip()
    if not _mime_allowed(mime):
        raise ValidationError(f"Unsupported content type: {mime or 'missing'}")
    headers = {k.lower(): v for k, v in response.headers.items()}
    return RawPayload(
        url=url,
        final_url=final_url,
        status_code=response.status_code,
        mime_type=mime,
        content=content,
        retrieved_at=datetime.now(UTC),
        content_hash=sha256_bytes(content),
        headers=headers,
    )


_ALLOWED_MIME_PREFIXES = (
    "text/",
    "application/json",
    "application/pdf",
    "application/xml",
    "application/xhtml",
    "application/vnd.",
    "application/octet-stream",
    "application/javascript",
)


def _mime_allowed(mime: str) -> bool:
    lowered = mime.lower().strip()
    if not lowered:
        return True
    return any(lowered.startswith(prefix) for prefix in _ALLOWED_MIME_PREFIXES)
