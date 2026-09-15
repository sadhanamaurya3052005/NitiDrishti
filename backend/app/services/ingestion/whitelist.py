"""Only official government (and explicitly listed) hosts may be fetched."""

from __future__ import annotations

from urllib.parse import urlparse

from app.config import settings
from app.core.exceptions import ValidationError

OFFICIAL_SUFFIXES = (".gov.in", ".nic.in")
EXTRA_OFFICIAL_HOSTS = frozenset(
    {
        "vikaspedia.in",
        "aicte-india.org",
        "www.aicte-india.org",
        "aicte.gov.in",
        "www.aicte.gov.in",
    }
)
VIKASPEDIA_ROOT = "vikaspedia.in"


def hostname_of(url: str) -> str:
    host = (urlparse(url).hostname or "").lower().strip(".")
    if host.startswith("www."):
        return host[4:]
    return host


def is_official_host(host: str) -> bool:
    host = host.lower().strip(".")
    if host.startswith("www."):
        host = host[4:]
    if host == VIKASPEDIA_ROOT or host.endswith("." + VIKASPEDIA_ROOT):
        return True
    if host in EXTRA_OFFICIAL_HOSTS or host in {item.removeprefix("www.") for item in EXTRA_OFFICIAL_HOSTS}:
        return True
    if any(host == item or host.endswith("." + item) for item in settings.ingestion_allowed_domain_list):
        return True
    return any(host.endswith(suffix) for suffix in OFFICIAL_SUFFIXES)


def assert_whitelisted(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValidationError(f"Unsupported URL scheme: {parsed.scheme or 'missing'}")
    host = hostname_of(url)
    if not host:
        raise ValidationError("URL is missing a hostname")
    if not is_official_host(host):
        raise ValidationError(f"Host is not on the official-domain whitelist: {host}")
    return host
