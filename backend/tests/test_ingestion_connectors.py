"""Whitelist and robots.txt gates for official hosts only."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from app.core.exceptions import SourceUnavailableError, ValidationError
from app.services.ingestion.robots import assert_robots_allowed, clear_robots_cache
from app.services.ingestion.whitelist import assert_whitelisted, is_official_host


def test_gov_in_hosts_are_official() -> None:
    assert is_official_host("pmkisan.gov.in")
    assert is_official_host("www.myscheme.gov.in")
    assert is_official_host("vikaspedia.in")
    assert not is_official_host("schemes.example.com")
    assert not is_official_host("wikipedia.org")


def test_assert_whitelisted_rejects_non_official() -> None:
    with pytest.raises(ValidationError):
        assert_whitelisted("https://example.com/schemes")
    assert assert_whitelisted("https://vikaspedia.in/schemesall") == "vikaspedia.in"


class _FakeResponse:
    def __init__(self, status_code: int, text: str) -> None:
        self.status_code = status_code
        self.text = text


def test_robots_allow_and_disallow() -> None:
    clear_robots_cache()
    allowed = "User-agent: *\nAllow: /\n"
    with patch("app.services.ingestion.robots.requests.get", return_value=_FakeResponse(200, allowed)):
        assert_robots_allowed("https://vikaspedia.in/schemesall")

    clear_robots_cache()
    denied = "User-agent: *\nDisallow: /\n"
    with (
        patch("app.services.ingestion.robots.requests.get", return_value=_FakeResponse(200, denied)),
        pytest.raises(SourceUnavailableError),
    ):
        assert_robots_allowed("https://nha.gov.in/")


def test_robots_html_body_is_fail_closed() -> None:
    clear_robots_cache()
    with (
        patch(
            "app.services.ingestion.robots.requests.get",
            return_value=_FakeResponse(200, "<html><title>not robots</title></html>"),
        ),
        pytest.raises(SourceUnavailableError),
    ):
        assert_robots_allowed("https://www.pmfby.gov.in/")
