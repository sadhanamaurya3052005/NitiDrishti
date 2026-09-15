"""In-memory artefacts passed between connectors, extractors, and the pipeline."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any


@dataclass(frozen=True)
class RawPayload:
    url: str
    final_url: str
    status_code: int
    mime_type: str
    content: bytes
    retrieved_at: datetime
    content_hash: str
    headers: dict[str, str] = field(default_factory=dict)

    @property
    def text(self) -> str:
        return self.content.decode("utf-8", errors="replace")


@dataclass
class ParsedDocument:
    payload: RawPayload
    title: str | None = None
    text: str = ""
    html: str | None = None
    json_data: Any = None
    rows: list[dict[str, Any]] = field(default_factory=list)
    next_data: dict[str, Any] | None = None
    json_ld: list[dict[str, Any]] = field(default_factory=list)
    links: list[str] = field(default_factory=list)


@dataclass
class NormalizedBenefit:
    label: str
    label_hi: str
    amount_text: str
    amount_paise: int | None = None
    periodicity: str | None = None


@dataclass
class NormalizedRule:
    rule_key: str
    kind: str
    label: str
    detail: str
    ast_json: dict[str, Any]
    age_min: int | None = None
    age_max: int | None = None
    income_limit: int | None = None
    sort_order: int = 0


@dataclass
class NormalizedDocumentNeed:
    code: str
    label: str
    is_mandatory: bool = True


@dataclass
class NormalizedScheme:
    slug: str
    name: str
    name_hi: str
    summary: str
    summary_hi: str
    category: str
    source_url: str
    code: str | None = None
    department_code: str | None = None
    status: str = "needs_review"
    badge: str = "Central"
    badge_hi: str = "केंद्रीय"
    benefits: list[NormalizedBenefit] = field(default_factory=list)
    rules: list[NormalizedRule] = field(default_factory=list)
    documents: list[NormalizedDocumentNeed] = field(default_factory=list)
    confidence: float = 0.0


@dataclass(frozen=True)
class SourceSpec:
    name: str
    url: str
    connector_type: str
    category: str | None = None
    department_code: str | None = None
    slug: str | None = None
    code: str | None = None
    is_listing: bool = False
    badge: str | None = None
    badge_hi: str | None = None
    opportunity_kind: str | None = None
    policy_code: str | None = None
    issuing_body: str | None = None
    gazette_ref: str | None = None


@dataclass
class NormalizedOpportunity:
    kind: str
    title: str
    title_hi: str
    summary: str
    source_url: str
    content_hash: str
    deadline: date | None = None
    income_limit: int | None = None
    department_code: str | None = None
    status: str = "needs_review"


@dataclass
class NormalizedClause:
    clause_ref: str
    text: str
    page_no: int | None = None
    sort_order: int = 0


@dataclass
class NormalizedPolicy:
    code: str
    title: str
    title_hi: str
    issuing_body: str
    source_url: str
    content_hash: str
    gazette_ref: str | None = None
    clauses: list[NormalizedClause] = field(default_factory=list)


@dataclass
class IngestResult:
    source_url: str
    status: str
    http_status: int | None = None
    rows_upserted: int = 0
    versions_created: int = 0
    unchanged: bool = False
    error_code: str | None = None
    detail: str | None = None
    content_hash: str | None = None
    child_urls: list[str] = field(default_factory=list)
