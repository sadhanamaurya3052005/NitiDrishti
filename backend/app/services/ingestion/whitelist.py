"""Only official government (and explicitly listed) hosts may be fetched."""

from __future__ import annotations

import ipaddress
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
_BLOCKED_HOST_LABELS = frozenset(
    {
        "localhost",
        "localhost.localdomain",
        "ip6-localhost",
        "ip6-loopback",
    }
)


def hostname_of(url: str) -> str:
    host = (urlparse(url).hostname or "").lower().strip(".")
    if host.startswith("www."):
        return host[4:]
    return host


def _is_blocked_network_host(host: str) -> bool:
    """Reject loopback / private / link-local targets even if a suffix somehow matched."""
    if host in _BLOCKED_HOST_LABELS or host.endswith(".localhost"):
        return True
    try:
        addr = ipaddress.ip_address(host)
    except ValueError:
        return False
    return bool(
        addr.is_private
        or addr.is_loopback
        or addr.is_link_local
        or addr.is_reserved
        or addr.is_multicast
        or addr.is_unspecified
    )


def is_official_host(host: str) -> bool:
    host = host.lower().strip(".")
    if host.startswith("www."):
        host = host[4:]
    if _is_blocked_network_host(host):
        return False
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
    if _is_blocked_network_host(host):
        raise ValidationError(f"Host is not allowed for official ingestion: {host}")
    # Literal IP literals that resolve only as public are still rejected unless official DNS name.
    try:
        ipaddress.ip_address(host)
        raise ValidationError(f"Raw IP addresses are not accepted as official sources: {host}")
    except ValueError:
        pass
    if not is_official_host(host):
        raise ValidationError(f"Host is not on the official-domain whitelist: {host}")
    return host
