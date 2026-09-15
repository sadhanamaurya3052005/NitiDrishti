"""Split ingested policy/gazette text into clauses. Does not invent wording."""

from __future__ import annotations

import re
from urllib.parse import urlparse

from app.services.ingestion.extractors import _clean_title, _first_paragraph, slugify
from app.services.ingestion.hashing import sha256_text
from app.services.ingestion.payload import (
    NormalizedClause,
    NormalizedPolicy,
    ParsedDocument,
    SourceSpec,
)

_CLAUSE_RE = re.compile(
    r"(?m)^\s*(?:clause\s+|section\s+|अनुच्छेद\s+)?(\d+[A-Za-z]?(?:\.\d+){0,3})[\.)\s]+(.{20,800})$"
)
_HEADING_RE = re.compile(r"(?m)^\s{0,3}([A-Z][A-Za-z0-9 ,/'()-]{8,90})\s*$")


def extract_policy(parsed: ParsedDocument, spec: SourceSpec) -> NormalizedPolicy | None:
    if spec.is_listing:
        return None
    title = _clean_title(parsed.title) or spec.name
    body = (parsed.text or "").strip()
    if not title or len(title) < 8 or len(body) < 80:
        return None
    issuing = spec.issuing_body or _issuing_body(body, parsed.payload.final_url)
    code = spec.policy_code or slugify(urlparse(parsed.payload.final_url).path.rsplit("/", 1)[-1] or title)[:64]
    clauses = _clauses(body)
    if not clauses:
        summary = _first_paragraph(body) or body[:1200]
        clauses = [NormalizedClause(clause_ref="1", text=summary[:8000], sort_order=0)]
    content_hash = sha256_text(
        f"{code}|{title}|{parsed.payload.final_url}|"
        + "|".join(f"{item.clause_ref}:{item.text}" for item in clauses)
    )
    return NormalizedPolicy(
        code=code[:64],
        title=title[:400],
        title_hi=title[:400],
        issuing_body=issuing[:300],
        source_url=parsed.payload.final_url,
        content_hash=content_hash,
        gazette_ref=spec.gazette_ref,
        clauses=clauses,
    )


def _issuing_body(text: str, url: str) -> str:
    host = (urlparse(url).hostname or "").lower()
    lowered = text.lower()
    if "ministry of education" in lowered or "education.gov.in" in host:
        return "Ministry of Education"
    if "electronics and information technology" in lowered or "meity" in host:
        return "Ministry of Electronics and Information Technology"
    if "vikaspedia" in host:
        return "Vikaspedia (MeitY / C-DAC)"
    if "meity.gov.in" in host:
        return "Ministry of Electronics and Information Technology"
    if "indiacode.nic.in" in host:
        return "Legislative Department, Ministry of Law and Justice"
    if "dopt.gov.in" in host:
        return "Department of Personnel and Training"
    return host or "Government of India"


def _clauses(body: str) -> list[NormalizedClause]:
    numbered: list[NormalizedClause] = []
    seen: set[str] = set()
    for match in _CLAUSE_RE.finditer(body):
        ref = match.group(1).strip()
        text = " ".join(match.group(2).split())
        if ref in seen or len(text) < 20:
            continue
        seen.add(ref)
        numbered.append(NormalizedClause(clause_ref=ref[:64], text=text[:8000], sort_order=len(numbered)))
        if len(numbered) >= 24:
            return numbered
    if numbered:
        return numbered

    headings = [line.strip() for line in _HEADING_RE.findall(body)]
    paragraphs = [chunk.strip() for chunk in re.split(r"\n{2,}", body) if len(chunk.strip()) >= 80]
    if not paragraphs:
        compact = " ".join(body.split())
        paragraphs = [compact[i : i + 900] for i in range(0, min(len(compact), 8000), 900) if compact[i : i + 900]]
    out: list[NormalizedClause] = []
    for index, para in enumerate(paragraphs[:24]):
        ref = headings[index][:64] if index < len(headings) else f"p{index + 1}"
        out.append(NormalizedClause(clause_ref=ref, text=" ".join(para.split())[:8000], sort_order=index))
    return out
