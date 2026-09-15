"""Extract job / internship / scholarship rows from official HTML. No invented vacancies."""

from __future__ import annotations

import re
from datetime import date, datetime
from urllib.parse import urljoin, urlparse

from app.services.ingestion.extractors import (
    _clean_title,
    _first_paragraph,
    _meta_description,
    _next_data_fields,
    _walk_urls,
)
from app.services.ingestion.hashing import sha256_text
from app.services.ingestion.payload import NormalizedOpportunity, ParsedDocument, SourceSpec
from app.services.ingestion.whitelist import is_official_host

_DEADLINE_RE = re.compile(
    r"(?:last date|deadline|closing date|apply by|last date to apply)"
    r"[^\d]{0,48}(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})",
    re.I,
)
_INCOME_RE = re.compile(r"income[^\d]{0,48}(?:₹|rs\.?|inr)?\s*([\d,]{4,})", re.I)
_MONTHS = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}

OPPORTUNITY_LISTING_HINTS = (
    "/education/scholarships/",
    "/scholarships/",
    "/schemes-for-students/scholarship",
    "/scholarship/",
    "/internship",
    "/internships",
    "/apprenticeship",
    "/fellowship",
    "/recruitment",
    "/recruitments",
    "/vacancies",
    "/vacancy",
    "/noticeboard",
    "notice_of_",
    "/advertisement",
    "/current-vacancies",
)

KIND_PATH_HINTS = {
    "scholarship": ("/scholarship", "scholar", "fellowship", "stipend"),
    "internship": ("/internship", "intern", "apprentice", "training"),
    "job": (
        "/recruitment",
        "/examinations",
        "vacancy",
        "vacancies",
        "notice_of_",
        "noticeboard",
        "advertisement",
        "/jobs",
    ),
}

_GENERIC_TITLES = {
    "",
    "vikaspedia",
    "home",
    "india",
    "government of india",
    "aicte",
    "upsc",
    "ssc",
    "notice",
    "addendum",
    "corrigendum",
    "recruitments",
    "recruitment",
    "vacancies",
    "vacancy",
    "scholarship",
    "scholarships",
    "internship",
    "internships",
    "schemes for students",
    "schemes",
    "ministry of railways (railway board)",
}

_JUNK_TITLE_RE = re.compile(
    r"^(page\s+\d+|microsoft word|vacancies for .+\.xlsx)|file\s*not\s*found|\{\{",
    re.I,
)


def extract_opportunity_listing_urls(parsed: ParsedDocument, spec: SourceSpec) -> list[str]:
    urls: list[str] = []
    seen: set[str] = set()
    seen_paths: set[str] = set()
    kind_hints = KIND_PATH_HINTS.get(spec.opportunity_kind or "", ())

    def add(candidate: str) -> None:
        absolute = urljoin(parsed.payload.final_url, candidate.strip(" '\""))
        host = (urlparse(absolute).hostname or "").lower()
        if host and not is_official_host(host):
            return
        path = urlparse(absolute).path.lower()
        haystack = f"{path} {absolute.lower()}"
        if not any(hint in haystack for hint in OPPORTUNITY_LISTING_HINTS):
            return
        if kind_hints and not any(token in haystack for token in kind_hints):
            return
        if path.rstrip("/") == urlparse(spec.url).path.rstrip("/"):
            return
        leaf = path.rstrip("/").rsplit("/", 1)[-1]
        if leaf in {"scholarship", "scholarships", "internship", "internships", "apprenticeship"}:
            return
        path_key = path.replace("/viewcontent", "", 1).rstrip("/")
        if path_key in seen_paths:
            return
        if absolute in seen:
            return
        seen.add(absolute)
        seen_paths.add(path_key)
        urls.append(absolute)

    for link in parsed.links:
        add(link)
    if parsed.next_data:
        for found in _walk_urls(parsed.next_data):
            add(found)
    return urls


def extract_opportunity(parsed: ParsedDocument, spec: SourceSpec) -> NormalizedOpportunity | None:
    if spec.is_listing and spec.opportunity_kind != "job":
        return None
    leaf = urlparse(parsed.payload.final_url).path.rstrip("/").rsplit("/", 1)[-1].lower()
    if leaf in {"scholarship", "scholarships", "internship", "internships", "apprenticeship"}:
        return None
    kind = spec.opportunity_kind
    if kind not in {"job", "internship", "scholarship"}:
        return None
    title = _clean_title(parsed.title) or spec.name
    page_bits = _next_data_fields(parsed.next_data)
    nested_title = _clean_title(page_bits.get("title"))
    if title.lower().strip() in _GENERIC_TITLES and nested_title:
        title = nested_title
    if title.lower().strip() in _GENERIC_TITLES or _JUNK_TITLE_RE.search(title):
        title = spec.name
    if "filenotfound" in parsed.payload.final_url.lower() or "{{" in title:
        return None
    summary = _meta_description(parsed.html) or page_bits.get("description") or _first_paragraph(parsed.text)
    if not title or len(title) < 8:
        return None
    summary = (summary or "").strip()
    if len(summary) < 40:
        summary = _first_paragraph(page_bits.get("html") or parsed.text) or summary
    if len(summary) < 40:
        return None
    blob = f"{title}\n{summary}\n{parsed.text}"
    status = "published"
    content_hash = sha256_text(f"{kind}|{parsed.payload.final_url}|{title}|{summary}")
    title_hi = _hindi_title(page_bits.get("html") or parsed.text, title)
    return NormalizedOpportunity(
        kind=kind,
        title=title[:300],
        title_hi=title_hi[:300],
        summary=summary[:4000],
        source_url=parsed.payload.final_url,
        content_hash=content_hash,
        deadline=_deadline(blob),
        income_limit=_income(blob) if kind == "scholarship" else None,
        department_code=spec.department_code,
        status=status,
    )


def _deadline(text: str) -> date | None:
    match = _DEADLINE_RE.search(text)
    if not match:
        return None
    raw = match.group(1).strip()
    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%d-%m-%y", "%d/%m/%y"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    parts = raw.replace(",", "").split()
    if len(parts) == 3:
        try:
            day = int(parts[0])
            month = _MONTHS.get(parts[1].lower())
            year = int(parts[2])
            if month:
                return date(year, month, day)
        except ValueError:
            return None
    return None


def _income(text: str) -> int | None:
    match = _INCOME_RE.search(text)
    if not match:
        return None
    try:
        value = int(match.group(1).replace(",", ""))
    except ValueError:
        return None
    if value < 0:
        return None
    return value


def _hindi_title(text: str, fallback: str) -> str:
    for line in (text or "").splitlines():
        cleaned = " ".join(line.split())
        if len(cleaned) >= 8 and any("\u0900" <= ch <= "\u097f" for ch in cleaned):
            return cleaned[:300]
    return fallback[:300]
