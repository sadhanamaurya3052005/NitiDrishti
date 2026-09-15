"""Deterministic extraction from fetched official artefacts. No LLM."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse

from bs4 import BeautifulSoup

from app.models.enums import RULE_KINDS, SCHEME_CATEGORIES
from app.services.ingestion.payload import (
    NormalizedBenefit,
    NormalizedDocumentNeed,
    NormalizedRule,
    NormalizedScheme,
    ParsedDocument,
    SourceSpec,
)

_SLUG_RE = re.compile(r"[^a-z0-9]+")
_AGE_RE = re.compile(
    r"(?:age|aged|minimum age|above|at least)\s*(?:of\s*)?(\d{1,2})\s*(?:\+|years?|yrs?)",
    re.I,
)
_RUPEE_RE = re.compile(
    r"(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(lakh|lakhs|crore|cr)?",
    re.I,
)
_DOC_HINTS = (
    ("aadhaar", "Aadhaar (masked locally)"),
    ("land", "Land registry"),
    ("bank", "Bank account proof"),
    ("income certificate", "Income certificate"),
    ("caste certificate", "Caste certificate"),
    ("ration", "Ration / SECC eligibility"),
    ("project report", "Project report"),
)

CATEGORY_FROM_PATH = (
    (("farmer", "kisan", "agriculture", "fasal", "crop", "pm-kisan"), "agriculture"),
    (("nsap", "old-age-pension", "national-social-assistance", "ig-noaps"), "welfare"),
    (("women", "matru", "maternity", "nrlm", "beti"), "women"),
    (("vishwakarma", "handloom", "handicraft", "sfurti", "artisan"), "artisans"),
    (("kaushal", "pmkvy", "skill-development"), "skills"),
    (("jan-dhan", "pmjdy", "financial-inclusion", "jan_dhan"), "banking"),
    (("scholar", "education", "matric", "student", "nsp-"), "education"),
    (("pmegp", "mudra", "msme", "udyam", "enterprise"), "msme"),
    (("health", "ayushman", "pm-jay", "hospital", "nhm"), "health"),
    (("awas", "housing", "pmay"), "housing"),
    (("khelo", "sports", "khel-abhiyan"), "sports"),
    (("inspire", "digital-india", "science-and-technology"), "science"),
    (("fame-india", "electric-vehicle", "e-bus", "pm-e-drive"), "transport"),
    (("tourism", "swadesh-darshan", "prashad"), "tourism"),
    (("jal-jeevan", "swachh-bharat", "jjm"), "jal"),
    (("legal-aid", "nalsa", "tele-law", "nyaya-bandhu"), "legal"),
    (("disaster", "ndma", "pmnrf", "sdrf"), "disaster"),
    (("e-shram", "eshram", "shram-yogi", "unorganised-sector"), "gig"),
)

LISTING_HINTS = ("/schemesall/", "/schemes-for-", "/viewcontent/", "/schemes/")

CATEGORY_BADGE = {
    "agriculture": ("Central · Agriculture & Rural", "केंद्रीय · कृषि एवं ग्रामीण"),
    "welfare": ("Central · Social Welfare", "केंद्रीय · सामाजिक कल्याण"),
    "education": ("Central · Education", "केंद्रीय · शिक्षा"),
    "msme": ("Central · MSME", "केंद्रीय · एमएसएमई"),
    "women": ("Central · Women & Child", "केंद्रीय · महिला एवं बाल"),
    "skills": ("Central · Skills & Jobs", "केंद्रीय · कौशल एवं रोजगार"),
    "banking": ("Central · Banking & Insurance", "केंद्रीय · बैंकिंग एवं बीमा"),
    "health": ("Central · Health", "केंद्रीय · स्वास्थ्य"),
    "housing": ("Central · Housing", "केंद्रीय · आवास"),
    "sports": ("Central · Sports & Culture", "केंद्रीय · खेल एवं संस्कृति"),
    "science": ("Central · Science & IT", "केंद्रीय · विज्ञान एवं आईटी"),
    "transport": ("Central · Transport", "केंद्रीय · परिवहन"),
    "tourism": ("Central · Travel & Tourism", "केंद्रीय · यात्रा एवं पर्यटन"),
    "jal": ("Central · Water & Sanitation", "केंद्रीय · जल एवं स्वच्छता"),
    "legal": ("Central · Legal Aid", "केंद्रीय · विधिक सहायता"),
    "artisans": ("Central · Artisans", "केंद्रीय · कारीगर"),
    "disaster": ("Central · Disaster Relief", "केंद्रीय · आपदा राहत"),
    "gig": ("Central · Gig & Labour", "केंद्रीय · गिग एवं श्रम"),
    "other": ("Central", "केंद्रीय"),
}


def slugify(value: str) -> str:
    slug = _SLUG_RE.sub("-", value.lower()).strip("-")
    return slug[:160] or "scheme"


def extract_listing_urls(parsed: ParsedDocument, spec: SourceSpec) -> list[str]:
    urls: list[str] = []
    seen: set[str] = set()
    origin_host = (urlparse(parsed.payload.final_url).hostname or "").lower()

    def add(candidate: str) -> None:
        if candidate in seen:
            return
        host = (urlparse(candidate).hostname or "").lower()
        if (
            host
            and origin_host
            and host != origin_host
            and not host.endswith(origin_host)
            and origin_host not in host
        ):
            return
        path = urlparse(candidate).path.lower()
        if not any(hint in path for hint in LISTING_HINTS):
            return
        if path.rstrip("/") == urlparse(spec.url).path.rstrip("/"):
            return
        seen.add(candidate)
        urls.append(candidate)

    for link in parsed.links:
        add(link)
    if parsed.next_data:
        for found in _walk_urls(parsed.next_data):
            add(found)
    return urls


def extract_schemes(parsed: ParsedDocument, spec: SourceSpec) -> list[NormalizedScheme]:
    if spec.is_listing:
        return []
    if parsed.rows and spec.connector_type in {"json", "tabular"}:
        schemes = [scheme for row in parsed.rows if (scheme := _from_row(row, parsed, spec))]
        if schemes:
            return schemes
    scheme = _from_document(parsed, spec)
    return [scheme] if scheme else []


def _from_document(parsed: ParsedDocument, spec: SourceSpec) -> NormalizedScheme | None:
    title = _clean_title(parsed.title) or spec.name
    page_bits = _next_data_fields(parsed.next_data)
    nested_title = _clean_title(page_bits.get("title"))
    if _title_is_generic(title) and nested_title:
        title = nested_title
    summary = _meta_description(parsed.html) or page_bits.get("description") or _first_paragraph(parsed.text)
    body = page_bits.get("html") or parsed.text
    if not title or len(title) < 8:
        return None

    name_hi = page_bits.get("title_hi") or title
    summary = (summary or "").strip()
    if len(summary) < 40:
        summary = _first_paragraph(body) or summary
    summary_hi = page_bits.get("description_hi") or summary

    category = _category_for(spec, parsed.payload.final_url, f"{title} {summary} {body}")
    badge, badge_hi = _badges(spec, category)
    slug = spec.slug or slugify(urlparse(parsed.payload.final_url).path.rsplit("/", 1)[-1] or title)
    text_for_facts = f"{title}\n{summary}\n{body}"
    benefits = _benefits_from_text(text_for_facts)
    rules = _rules_from_text(text_for_facts)
    documents = _documents_from_text(text_for_facts)

    substantial = len(re.sub(r"\s+", " ", f"{summary} {body}")) >= 280
    confidence = 0.35
    if substantial:
        confidence += 0.4
    if summary and len(summary) >= 40:
        confidence += 0.15
    if benefits or rules:
        confidence += 0.1
    has_identity = len(title) >= 8 and len(summary) >= 40
    status = "published" if has_identity and confidence >= 0.5 else "needs_review"

    if not summary:
        summary = "Official page retrieved; structured summary needs review."
        summary_hi = summary
        status = "needs_review"
        confidence = min(confidence, 0.4)

    if not benefits:
        benefits = [
            NormalizedBenefit(
                label="As notified in the official source",
                label_hi="आधिकारिक स्रोत में अधिसूचित अनुसार",
                amount_text="As notified in the official source",
            )
        ]

    return NormalizedScheme(
        slug=slug[:160],
        code=spec.code,
        name=title[:300],
        name_hi=name_hi[:300],
        summary=summary,
        summary_hi=summary_hi,
        category=category,
        department_code=spec.department_code,
        source_url=parsed.payload.final_url,
        status=status,
        badge=spec.badge or badge,
        badge_hi=spec.badge_hi or badge_hi,
        benefits=benefits,
        rules=rules,
        documents=documents,
        confidence=round(min(confidence, 1.0), 2),
    )


def _from_row(row: dict[str, Any], parsed: ParsedDocument, spec: SourceSpec) -> NormalizedScheme | None:
    lowered = {str(k).lower().strip(): v for k, v in row.items()}
    name = _as_str(lowered.get("name") or lowered.get("title") or lowered.get("scheme_name"))
    if not name:
        return None
    summary = _as_str(
        lowered.get("summary") or lowered.get("description") or lowered.get("details") or name
    )
    source_url = _as_str(lowered.get("source_url") or lowered.get("url") or parsed.payload.final_url)
    slug = spec.slug or slugify(_as_str(lowered.get("slug") or lowered.get("code") or name))
    category = _as_str(lowered.get("category")) or spec.category or "other"
    if category not in SCHEME_CATEGORIES:
        category = spec.category or "other"
    name_hi = _as_str(lowered.get("name_hi") or lowered.get("namehi")) or name
    summary_hi = _as_str(lowered.get("summary_hi") or lowered.get("summaryhi")) or summary
    badge, badge_hi = _badges(spec, category)
    return NormalizedScheme(
        slug=slug,
        code=_as_str(lowered.get("code")) or spec.code,
        name=name[:300],
        name_hi=name_hi[:300],
        summary=summary,
        summary_hi=summary_hi,
        category=category,
        department_code=spec.department_code,
        source_url=source_url,
        status="published" if len(summary) >= 40 else "needs_review",
        badge=badge,
        badge_hi=badge_hi,
        benefits=_benefits_from_text(f"{name} {summary}"),
        rules=_rules_from_text(f"{name} {summary}"),
        documents=_documents_from_text(f"{name} {summary}"),
        confidence=0.8 if len(summary) >= 40 else 0.4,
    )


def _as_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _title_is_generic(title: str) -> bool:
    cleaned = title.strip().lower()
    return cleaned in {"", "vikaspedia", "myscheme", "find scheme", "search schemes"}


def _clean_title(value: str | None) -> str:
    if not value:
        return ""
    title = re.sub(r"\s+", " ", value).strip()
    if " | Vikaspedia" in title:
        title = title.split(" | Vikaspedia", 1)[0].strip()
    for suffix in (" | MyScheme", " | India Portal", " | Government of India"):
        if title.endswith(suffix):
            title = title[: -len(suffix)].strip()
    return title


def _meta_description(html: str | None) -> str:
    if not html:
        return ""
    soup = BeautifulSoup(html, "lxml")
    tag = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
    if tag and tag.get("content"):
        return str(tag["content"]).strip()
    return ""


def _first_paragraph(text: str) -> str:
    for chunk in re.split(r"\n+", text or ""):
        cleaned = re.sub(r"\s+", " ", chunk).strip()
        if len(cleaned) >= 40 and "cookie" not in cleaned.lower():
            return cleaned[:1200]
    cleaned = re.sub(r"\s+", " ", text or "").strip()
    return cleaned[:1200]


def _next_data_fields(next_data: dict[str, Any] | None) -> dict[str, str]:
    found: dict[str, str] = {}
    if not next_data:
        return found
    props = next_data.get("props", {}).get("pageProps", next_data)
    if not isinstance(props, dict):
        return found

    focused = {
        key: props[key]
        for key in ("ssrPageData", "ssrPageContent", "ssrCanonicalUrl")
        if key in props
    } or props

    def consider(key: str, value: str) -> None:
        lowered = key.lower()
        if lowered in {"ssrnavigation", "ssrnavmenu", "ssrcontentlist", "ssrrelatedkeywords", "ssrbreadcrumbs"}:
            return
        if "title" in lowered and "hi" not in lowered and "title" not in found and len(value) < 300:
            found["title"] = _clean_title(value)
        elif "title" in lowered and "hi" in lowered:
            found.setdefault("title_hi", value[:300])
        elif any(token in lowered for token in ("description", "summary", "shortdesc")) and "hi" not in lowered:
            if "description" not in found or len(value) > len(found["description"]):
                found["description"] = value[:2000]
        elif (
            ("html" in lowered or lowered in {"content", "ssrpagecontent", "body"})
            and "<" in value
            and len(value) > len(found.get("html", ""))
        ):
            text = BeautifulSoup(value, "lxml").get_text(" ", strip=True)
            found["html"] = text[:20000]

    def walk(obj: Any, key: str = "") -> None:
        if key.lower() in {"ssrnavmenu", "ssrcontentlist", "ssrrelatedkeywords", "ssrbreadcrumbs", "ssrctx"}:
            return
        if isinstance(obj, str) and obj.strip():
            consider(key, obj.strip())
            return
        if isinstance(obj, dict):
            for child_key, child in obj.items():
                walk(child, str(child_key))
            return
        if isinstance(obj, list):
            for child in obj[:80]:
                walk(child, key)

    walk(focused)
    return found


def _walk_urls(obj: Any) -> list[str]:
    found: list[str] = []

    def walk(value: Any, key: str = "") -> None:
        if isinstance(value, str) and value.startswith("http") and key.lower() in {
            "url",
            "href",
            "canonical",
            "ssrcanonicalurl",
            "path",
            "link",
        }:
            found.append(value)
            return
        if isinstance(value, str) and value.startswith("/") and "scheme" in value.lower():
            found.append(value)
            return
        if isinstance(value, dict):
            for child_key, child in value.items():
                walk(child, str(child_key))
            return
        if isinstance(value, list):
            for child in value[:200]:
                walk(child, key)

    walk(obj)
    return found


def _category_for(spec: SourceSpec, url: str, blob: str) -> str:
    if spec.category and spec.category in SCHEME_CATEGORIES:
        return spec.category
    haystack = f"{url} {blob}".lower()
    for tokens, category in CATEGORY_FROM_PATH:
        if any(token in haystack for token in tokens):
            return category
    return "other"


def _badges(spec: SourceSpec, category: str) -> tuple[str, str]:
    if spec.badge and spec.badge_hi:
        return spec.badge, spec.badge_hi
    return CATEGORY_BADGE.get(category, CATEGORY_BADGE["other"])


def _benefits_from_text(text: str) -> list[NormalizedBenefit]:
    matches = _RUPEE_RE.findall(text)
    benefits: list[NormalizedBenefit] = []
    seen: set[str] = set()
    for amount, unit in matches[:3]:
        number = amount.replace(",", "")
        label = f"₹{amount}" + (f" {unit}" if unit else "")
        if label in seen:
            continue
        seen.add(label)
        paise = None
        try:
            rupees = float(number)
            if unit.lower().startswith("lakh"):
                rupees *= 100000
            elif unit.lower().startswith("cr"):
                rupees *= 10000000
            paise = int(rupees * 100)
        except ValueError:
            paise = None
        benefits.append(
            NormalizedBenefit(label=label, label_hi=label, amount_text=label, amount_paise=paise)
        )
    return benefits


def _rules_from_text(text: str) -> list[NormalizedRule]:
    rules: list[NormalizedRule] = []
    age_match = _AGE_RE.search(text)
    if age_match:
        age = int(age_match.group(1))
        if 0 <= age <= 120:
            rules.append(
                NormalizedRule(
                    rule_key="age",
                    kind="age",
                    label=f"Age {age}+",
                    detail=f"Official page mentions a minimum age of {age}.",
                    ast_json={"op": "gte", "field": "age", "value": age},
                    age_min=age,
                )
            )
    lowered = text.lower()
    if "landholding" in lowered or "land holding" in lowered or "cultivator" in lowered:
        rules.append(
            NormalizedRule(
                rule_key="land",
                kind="land",
                label="Recorded agricultural land",
                detail="Official page refers to landholding / cultivator status.",
                ast_json={"op": "gte", "field": "land_hectares", "value": 0.01},
                sort_order=1,
            )
        )
    if re.search(r"\bwomen\b|\bmother\b|\bmaternity\b|\bfemale\b", lowered):
        rules.append(
            NormalizedRule(
                rule_key="gender",
                kind="gender",
                label="Woman beneficiary",
                detail="Official page describes a women-focused benefit.",
                ast_json={"op": "eq", "field": "gender", "value": "female"},
                sort_order=2,
            )
        )
    return [rule for rule in rules if rule.kind in RULE_KINDS]


def _documents_from_text(text: str) -> list[NormalizedDocumentNeed]:
    lowered = text.lower()
    docs: list[NormalizedDocumentNeed] = []
    seen: set[str] = set()
    for needle, label in _DOC_HINTS:
        if needle in lowered and needle not in seen:
            seen.add(needle)
            docs.append(NormalizedDocumentNeed(code=slugify(needle)[:64], label=label))
    return docs
