"""robots.txt respect. Fail-closed when the file cannot be read or parsed."""

from __future__ import annotations

from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import requests

from app.config import settings
from app.core.exceptions import SourceUnavailableError
from app.services.ingestion.whitelist import hostname_of

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
        response = requests.get(
            robots_url,
            headers={"User-Agent": settings.ingestion_user_agent, "Accept": "text/plain,*/*"},
            timeout=min(15, settings.ingestion_request_timeout),
            allow_redirects=True,
        )
    except requests.RequestException as exc:
        _CACHE[origin] = None
        raise SourceUnavailableError(f"robots.txt unreachable for {hostname_of(page_url)}") from exc

    if response.status_code == 404:
        parser = RobotFileParser()
        parser.parse(["User-agent: *", "Allow: /"])
        _CACHE[origin] = parser
        return parser

    if response.status_code >= 400:
        _CACHE[origin] = None
        raise SourceUnavailableError(f"robots.txt HTTP {response.status_code} for {hostname_of(page_url)}")

    body = response.text
    if "<html" in body[:400].lower():
        _CACHE[origin] = None
        raise SourceUnavailableError(f"robots.txt for {hostname_of(page_url)} is not a robots file")

    parser = RobotFileParser()
    parser.parse(body.splitlines())
    _CACHE[origin] = parser
    return parser


def assert_robots_allowed(url: str) -> None:
    parser = _load_parser(url)
    if not parser.can_fetch(settings.ingestion_user_agent, url):
        raise SourceUnavailableError(f"robots.txt disallows fetching {url}")


def clear_robots_cache() -> None:
    _CACHE.clear()
