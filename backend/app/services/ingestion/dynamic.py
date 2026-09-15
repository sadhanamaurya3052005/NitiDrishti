"""Optional Playwright connector for JS-rendered official pages. No login/CAPTCHA."""

from __future__ import annotations

from datetime import UTC, datetime

from app.core.exceptions import SourceUnavailableError
from app.services.ingestion.base import SourceConnector
from app.services.ingestion.hashing import sha256_bytes
from app.services.ingestion.html import HtmlConnector
from app.services.ingestion.payload import ParsedDocument, RawPayload
from app.services.ingestion.robots import assert_robots_allowed
from app.services.ingestion.whitelist import assert_whitelisted


class DynamicConnector(SourceConnector):
    connector_type = "dynamic"

    def fetch(self, url: str) -> RawPayload:
        assert_whitelisted(url)
        assert_robots_allowed(url)
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as exc:
            raise SourceUnavailableError(
                "Playwright is not installed; JS-rendered fetch is skipped for this source"
            ) from exc

        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(headless=True)
                try:
                    page = browser.new_page()
                    response = page.goto(url, wait_until="domcontentloaded", timeout=45_000)
                    html = page.content()
                    status = response.status if response is not None else 200
                    final_url = page.url
                finally:
                    browser.close()
        except SourceUnavailableError:
            raise
        except Exception as exc:
            raise SourceUnavailableError(f"Headless fetch failed for {url}: {type(exc).__name__}") from exc

        assert_whitelisted(final_url)
        content = html.encode("utf-8")
        return RawPayload(
            url=url,
            final_url=final_url,
            status_code=status,
            mime_type="text/html",
            content=content,
            retrieved_at=datetime.now(UTC),
            content_hash=sha256_bytes(content),
        )

    def parse(self, payload: RawPayload) -> ParsedDocument:
        return HtmlConnector(self.retrieve_fn).parse(payload)
