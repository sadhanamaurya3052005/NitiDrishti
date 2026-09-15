"""Static HTML connector, including server-rendered Next.js pages."""

from __future__ import annotations

import json
import re
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from app.services.ingestion.base import SourceConnector
from app.services.ingestion.payload import ParsedDocument, RawPayload

_NEXT_DATA_RE = re.compile(
    r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
    re.S,
)


class HtmlConnector(SourceConnector):
    connector_type = "html"

    def parse(self, payload: RawPayload) -> ParsedDocument:
        html = payload.text
        soup = BeautifulSoup(html, "lxml")
        title = soup.title.get_text(" ", strip=True) if soup.title else None
        next_data = _parse_next_data(html)
        json_ld = _parse_json_ld(soup)
        links = _collect_links(soup, payload.final_url)
        text = _visible_text(soup)
        if next_data:
            page_props = next_data.get("props", {}).get("pageProps") or {}
            if isinstance(page_props, dict):
                extra = _flatten_strings(
                    {key: page_props[key] for key in ("ssrPageContent", "ssrPageData") if key in page_props}
                )
                if extra:
                    text = f"{text}\n{extra}".strip()
        return ParsedDocument(
            payload=payload,
            title=title,
            text=text,
            html=html,
            next_data=next_data,
            json_ld=json_ld,
            json_data=next_data,
            links=links,
        )


def _parse_next_data(html: str) -> dict[str, Any] | None:
    match = _NEXT_DATA_RE.search(html)
    if not match:
        return None
    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def _parse_json_ld(soup: BeautifulSoup) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    for tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        raw = tag.string or tag.get_text() or ""
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict):
            found.append(data)
        elif isinstance(data, list):
            found.extend(item for item in data if isinstance(item, dict))
    return found


def _collect_links(soup: BeautifulSoup, base: str) -> list[str]:
    links: list[str] = []
    seen: set[str] = set()
    for tag in soup.find_all("a", href=True):
        href = str(tag["href"]).strip()
        if not href or href.startswith(("#", "javascript:", "mailto:")):
            continue
        absolute = urljoin(base, href)
        if absolute not in seen:
            seen.add(absolute)
            links.append(absolute)
    return links


def _visible_text(soup: BeautifulSoup) -> str:
    cloned = BeautifulSoup(str(soup), "lxml")
    for tag in cloned(["script", "style", "noscript"]):
        tag.decompose()
    article = cloned.find("article") or cloned.find("main") or cloned.find(id="content") or cloned.body
    node = article or cloned
    return re.sub(r"\s+", " ", node.get_text(" ", strip=True)).strip()


def _flatten_strings(obj: Any, *, budget: int = 20000) -> str:
    chunks: list[str] = []
    used = 0

    def walk(value: Any) -> None:
        nonlocal used
        if used >= budget:
            return
        if isinstance(value, str):
            text = value.strip()
            if len(text) >= 12:
                chunks.append(text)
                used += len(text)
            return
        if isinstance(value, dict):
            for item in value.values():
                walk(item)
            return
        if isinstance(value, list):
            for item in value:
                walk(item)

    walk(obj)
    return "\n".join(chunks)
