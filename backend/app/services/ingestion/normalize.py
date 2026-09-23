"""Cleaning and unit normalisation. Original gazette wording stays on the rule detail."""

from __future__ import annotations

import re
from datetime import date, datetime

_INR_RE = re.compile(
    r"(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(lakh|lakhs|lac|crore|cr)?",
    re.I,
)
_BARE_AMOUNT_RE = re.compile(
    r"\b([\d,]+(?:\.\d+)?)\s*(lakh|lakhs|lac|crore|cr)\b",
    re.I,
)
_ISO_DATE = re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b")
_DMY_DATE = re.compile(r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b")
_NAMED_DATE = re.compile(
    r"\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b",
    re.I,
)

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
}


def rupees_from_text(text: str) -> int | None:
    """₹2,50,000 / Rs. 2.5 lakh / INR 250000 → integer rupees. None if unreadable."""
    amounts = list(iter_rupee_amounts(text))
    return amounts[0] if amounts else None


def iter_rupee_amounts(text: str) -> list[int]:
    if not text:
        return []
    found: list[int] = []
    seen: set[int] = set()
    for match in list(_INR_RE.finditer(text)) + list(_BARE_AMOUNT_RE.finditer(text)):
        rupees = _match_to_rupees(match)
        if rupees is None or rupees in seen:
            continue
        seen.add(rupees)
        found.append(rupees)
    return found


def _match_to_rupees(match: re.Match[str]) -> int | None:
    raw, unit = match.group(1), match.group(2) or ""
    try:
        value = float(raw.replace(",", ""))
    except ValueError:
        return None
    folded = unit.lower()
    if folded.startswith("lakh") or folded == "lac":
        value *= 100_000
    elif folded.startswith("cr"):
        value *= 10_000_000
    if value < 0:
        return None
    return int(round(value))


def date_from_text(text: str) -> date | None:
    """01/04/2026, 1 April 2026, 2026-04-01 → date. Does not invent a date."""
    if not text:
        return None
    iso = _ISO_DATE.search(text)
    if iso:
        return _safe_date(int(iso.group(1)), int(iso.group(2)), int(iso.group(3)))
    named = _NAMED_DATE.search(text)
    if named:
        month = _MONTHS.get(named.group(2).lower())
        if month:
            return _safe_date(int(named.group(3)), month, int(named.group(1)))
    dmy = _DMY_DATE.search(text)
    if dmy:
        day, month, year = int(dmy.group(1)), int(dmy.group(2)), int(dmy.group(3))
        if month > 12 and day <= 12:
            day, month = month, day
        return _safe_date(year, month, day)
    return None


def _safe_date(year: int, month: int, day: int) -> date | None:
    try:
        return datetime(year, month, day).date()
    except ValueError:
        return None
