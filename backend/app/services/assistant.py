"""Keyword assistant over ingested official text. No eligibility decisions. No fake RAG."""

from __future__ import annotations

import re

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.opportunities import Internship, Job, Scholarship
from app.models.policy import Policy, PolicyClause, PolicyVersion
from app.models.schemes import Scheme, SchemeVersion
from app.repositories.schemes import SchemeRepository

_ELIGIBILITY_DECISION = re.compile(
    r"\b(am i eligible|do i qualify|will i get|can i apply|पात्र हूँ|पात्र हूं|मिल(ेगा|ेगी))\b",
    re.I,
)


class AssistantService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.schemes = SchemeRepository(session)

    def ask(self, query: str) -> dict:
        if _ELIGIBILITY_DECISION.search(query):
            return {
                "mode": "keyword",
                "semantic_available": False,
                "decides_eligibility": False,
                "text": (
                    "I can search and explain official text, but I do not decide eligibility. "
                    "Use the deterministic rule engine on the Citizen desk. "
                    "Semantic search is unavailable because pgvector is not installed."
                ),
                "citations": [],
                "note": "Keyword assistant only. No embeddings. Eligibility is never decided here.",
            }

        tokens = [token for token in re.split(r"\W+", query.lower()) if len(token) >= 3][:8]
        hits = self._search(query, tokens)
        if not hits:
            return {
                "mode": "keyword",
                "semantic_available": False,
                "decides_eligibility": False,
                "text": (
                    "No ingested official chunk matched that question. "
                    "I will not invent a gazette. Semantic search needs pgvector, which is not installed."
                ),
                "citations": [],
                "note": "Keyword assistant only. Empty result is honest.",
            }

        lines = [f"{item['title']}: {item['snippet']}" for item in hits]
        return {
            "mode": "keyword",
            "semantic_available": False,
            "decides_eligibility": False,
            "text": "\n\n".join(lines),
            "citations": [{"title": item["title"], "source_url": item["source_url"], "kind": item["kind"]} for item in hits],
            "note": "Keyword match over ingested official text. Not semantic RAG.",
        }

    def _search(self, query: str, tokens: list[str]) -> list[dict]:
        pattern = f"%{query.strip()[:80]}%"
        hits: list[dict] = []
        hits.extend(self._scheme_hits(pattern, tokens))
        hits.extend(self._opportunity_hits(pattern, Job, "job"))
        hits.extend(self._opportunity_hits(pattern, Internship, "internship"))
        hits.extend(self._opportunity_hits(pattern, Scholarship, "scholarship"))
        hits.extend(self._policy_hits(pattern))
        return hits[:5]

    def _scheme_hits(self, pattern: str, tokens: list[str]) -> list[dict]:
        stmt = (
            select(Scheme, SchemeVersion)
            .join(SchemeVersion, Scheme.current_version_id == SchemeVersion.id)
            .where(Scheme.status == "published")
            .where(
                or_(
                    SchemeVersion.name.ilike(pattern),
                    SchemeVersion.name_hi.ilike(pattern),
                    SchemeVersion.summary.ilike(pattern),
                    Scheme.code.ilike(pattern),
                )
            )
            .limit(5)
        )
        rows = list(self.session.execute(stmt).all())
        if not rows and tokens:
            clauses = [SchemeVersion.name.ilike(f"%{token}%") for token in tokens[:3]]
            stmt = (
                select(Scheme, SchemeVersion)
                .join(SchemeVersion, Scheme.current_version_id == SchemeVersion.id)
                .where(Scheme.status == "published")
                .where(or_(*clauses))
                .limit(5)
            )
            rows = list(self.session.execute(stmt).all())
        return [
            {
                "kind": "scheme",
                "title": version.name,
                "snippet": (version.summary or "")[:400],
                "source_url": version.source_url,
            }
            for _scheme, version in rows
        ]

    def _opportunity_hits(self, pattern: str, model: type, kind: str) -> list[dict]:
        stmt = (
            select(model)
            .where(model.status == "published")
            .where(or_(model.title.ilike(pattern), model.summary.ilike(pattern)))
            .limit(3)
        )
        return [
            {
                "kind": kind,
                "title": row.title,
                "snippet": (row.summary or "")[:400],
                "source_url": row.source_url,
            }
            for row in self.session.scalars(stmt)
        ]

    def _policy_hits(self, pattern: str) -> list[dict]:
        stmt = (
            select(Policy, PolicyVersion)
            .join(PolicyVersion, Policy.current_version_id == PolicyVersion.id)
            .where(or_(Policy.title.ilike(pattern), Policy.code.ilike(pattern)))
            .limit(3)
        )
        hits = [
            {
                "kind": "policy",
                "title": policy.title,
                "snippet": f"{policy.issuing_body}. Gazette {version.gazette_ref or '—'}.",
                "source_url": version.source_url,
            }
            for policy, version in self.session.execute(stmt)
        ]
        if hits:
            return hits
        clause_stmt = (
            select(PolicyClause, PolicyVersion)
            .join(PolicyVersion, PolicyClause.policy_version_id == PolicyVersion.id)
            .where(PolicyClause.text.ilike(pattern))
            .limit(3)
        )
        return [
            {
                "kind": "policy_clause",
                "title": f"Clause {clause.clause_ref}",
                "snippet": clause.text[:400],
                "source_url": version.source_url,
            }
            for clause, version in self.session.execute(clause_stmt)
        ]
