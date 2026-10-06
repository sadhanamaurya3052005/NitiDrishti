"""HTTP download primitive: timeout, size cap, retries. No robots check here."""

from __future__ import annotations

import time
from collections.abc import Callable
from datetime import UTC, datetime
from urllib.parse import urljoin, urlparse, urlunparse

import requests
from requests.adapters import HTTPAdapter

from app.config import settings
from app.core.exceptions import SourceUnavailableError, ValidationError
from app.services.ingestion.hashing import sha256_bytes
from app.services.ingestion.payload import RawPayload
from app.services.ingestion.whitelist import assert_whitelisted, select_pinned_ip

RetrieveFn = Callable[[str], RawPayload]


def _headers() -> dict[str, str]:
    return {
        "User-Agent": settings.ingestion_user_agent,
        "Accept": "text/html,application/xhtml+xml,application/pdf,text/csv,application/json,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-IN,en,hi;q=0.8",
    }


def _max_bytes() -> int:
    return max(1, settings.ingestion_max_file_mb) * 1024 * 1024


class _PinnedHostAdapter(HTTPAdapter):
    """Talk to a pinned IP while TLS and the Host header stay on the official name."""

    def __init__(self, server_hostname: str) -> None:
        self._server_hostname = server_hostname
        super().__init__()

    def init_poolmanager(self, connections, maxsize, block=False, **pool_kwargs):
        pool_kwargs["server_hostname"] = self._server_hostname
        pool_kwargs["assert_hostname"] = self._server_hostname
        return super().init_poolmanager(connections, maxsize, block, **pool_kwargs)

    def send(self, request, **kwargs):
        request.headers["Host"] = self._server_hostname
        return super().send(request, **kwargs)


def _pinned_url(url: str, pinned_ip: str) -> tuple[str, str]:
    parsed = urlparse(url)
    host = parsed.hostname or ""
    netloc = f"[{pinned_ip}]" if ":" in pinned_ip else pinned_ip
    if parsed.port:
        netloc = f"{netloc}:{parsed.port}"
    rewritten = urlunparse((parsed.scheme, netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))
    return rewritten, host


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
    current = url
    response = None
    session = None
    for _hop in range(5):
        assert_whitelisted(current)
        parsed = urlparse(current)
        lookup = (parsed.hostname or "").lower().strip(".")
        pinned = select_pinned_ip(lookup)
        target, hostname = _pinned_url(current, pinned)
        session = requests.Session()
        adapter = _PinnedHostAdapter(hostname)
        session.mount("https://", adapter)
        session.mount("http://", adapter)
        try:
            response = session.get(
                target,
                headers={**_headers(), "Host": hostname},
                timeout=timeout,
                stream=True,
                allow_redirects=False,
            )
        except requests.RequestException as exc:
            session.close()
            raise SourceUnavailableError(f"Request failed for {current}: {type(exc).__name__}") from exc
        if response.is_redirect:
            location = response.headers.get("Location") or ""
            response.close()
            session.close()
            if not location:
                raise SourceUnavailableError(f"Redirect from {current} had no Location")
            current = urljoin(current, location)
            response = None
            continue
        break
    else:
        raise ValidationError(f"Too many redirects for {url}")
    if response is None:
        raise SourceUnavailableError(f"Request failed for {url}")

    final_url = current
    assert_whitelisted(final_url)

    content_length = response.headers.get("Content-Length")
    if content_length and content_length.isdigit() and int(content_length) > _max_bytes():
        response.close()
        if session is not None:
            session.close()
        raise ValidationError(f"Remote file exceeds size cap ({settings.ingestion_max_file_mb} MB)")
    if response.status_code >= 400:
        status_code = response.status_code
        response.close()
        if session is not None:
            session.close()
        raise SourceUnavailableError(f"HTTP {status_code} for {final_url}")

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
        content = b"".join(chunks)
        mime = (response.headers.get("Content-Type") or "application/octet-stream").split(";")[0].strip()
        if not _mime_allowed(mime):
            raise ValidationError(f"Unsupported content type: {mime or 'missing'}")
        headers = {k.lower(): v for k, v in response.headers.items()}
        status_code = response.status_code
    finally:
        response.close()
        if session is not None:
            session.close()
    return RawPayload(
        url=url,
        final_url=final_url,
        status_code=status_code,
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
