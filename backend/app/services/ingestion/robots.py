"""robots.txt respect. Fail-closed when the file cannot be read or parsed."""

from __future__ import annotations

from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests

from app.config import settings
from app.core.exceptions import SourceUnavailableError, ValidationError
from app.services.ingestion.http import _PinnedHostAdapter, _pinned_url
from app.services.ingestion.whitelist import assert_whitelisted, hostname_of, select_pinned_ip

_CACHE: dict[str, RobotFileParser | None] = {}


def robots_url_for(page_url: str) -> str:
    parsed = urlparse(page_url)
    return f"{parsed.scheme}://{parsed.netloc}/robots.txt"


def _load_parser(page_url: str) -> RobotFileParser:
    origin = f"{urlparse(page_url).scheme}://{urlparse(page_url).netloc}"
    cached = _CACHE.get(origin)
    if cached is not None:
        return cached
    if origin in _CACHE and cached is None:
        raise SourceUnavailableError(f"Cannot confirm robots.txt allow for {hostname_of(page_url)}")

    robots_url = robots_url_for(page_url)
    try:
        status_code, body = _pinned_robots_get(robots_url)
    except (requests.RequestException, ValidationError, SourceUnavailableError) as exc:
        _CACHE[origin] = None
        raise SourceUnavailableError(f"robots.txt unreachable for {hostname_of(page_url)}") from exc

    if status_code == 404:
        parser = RobotFileParser()
        parser.parse(["User-agent: *", "Allow: /"])
        _CACHE[origin] = parser
        return parser

    if status_code >= 400:
        _CACHE[origin] = None
        raise SourceUnavailableError(f"robots.txt HTTP {status_code} for {hostname_of(page_url)}")

    if "<html" in body[:400].lower():
        _CACHE[origin] = None
        raise SourceUnavailableError(f"robots.txt for {hostname_of(page_url)} is not a robots file")

    parser = RobotFileParser()
    parser.parse(body.splitlines())
    _CACHE[origin] = parser
    return parser


def _pinned_robots_get(url: str) -> tuple[int, str]:
    """Fetch robots.txt on a pinned address. Every redirect is revalidated."""
    timeout = min(15, settings.ingestion_request_timeout)
    current = url
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
                headers={"User-Agent": settings.ingestion_user_agent, "Accept": "text/plain,*/*", "Host": hostname},
                timeout=timeout,
                allow_redirects=False,
            )
            if response.is_redirect:
                location = response.headers.get("Location") or ""
                response.close()
                if not location:
                    raise SourceUnavailableError(f"robots.txt redirect from {current} had no Location")
                current = urljoin(current, location)
                continue
            status_code = response.status_code
            body = response.text
            response.close()
            return status_code, body
        finally:
            session.close()
    raise ValidationError(f"Too many redirects for {url}")


def assert_robots_allowed(url: str) -> None:
    parser = _load_parser(url)
    if not parser.can_fetch(settings.ingestion_user_agent, url):
        raise SourceUnavailableError(f"robots.txt disallows fetching {url}")


def clear_robots_cache() -> None:
    _CACHE.clear()
