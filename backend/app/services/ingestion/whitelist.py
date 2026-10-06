"""Only official government (and explicitly listed) hosts may be fetched."""

from __future__ import annotations

import ipaddress
import socket
from collections.abc import Callable
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


Address = ipaddress.IPv4Address | ipaddress.IPv6Address
Resolver = Callable[[str], list[Address]]


def address_is_blocked(addr: Address) -> bool:
    """Private, loopback, link-local, reserved, multicast, and unspecified addresses."""
    return bool(
        addr.is_private
        or addr.is_loopback
        or addr.is_link_local
        or addr.is_reserved
        or addr.is_multicast
        or addr.is_unspecified
    )


def _resolve_host(host: str) -> list[Address]:
    infos = socket.getaddrinfo(host, None)
    found: list[Address] = []
    for info in infos:
        sockaddr = info[4]
        if not sockaddr:
            continue
        raw = str(sockaddr[0]).split("%", 1)[0]
        try:
            found.append(ipaddress.ip_address(raw))
        except ValueError:
            continue
    return found


def select_pinned_ip(host: str, *, resolver: Resolver | None = None) -> str:
    """Resolve once and return one public address. Any blocked answer fails closed."""
    lookup = resolver or _resolve_host
    try:
        addresses = list(lookup(host))
    except ValidationError:
        raise
    except OSError as exc:
        raise ValidationError(f"Could not resolve official host: {host}") from exc
    if not addresses:
        raise ValidationError(f"Could not resolve official host: {host}")
    if any(address_is_blocked(addr) for addr in addresses):
        raise ValidationError(f"Official host resolved to a blocked address: {host}")
    return str(addresses[0])


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
