"""Immutable scheme versions. Updates insert a new row and retarget current_version_id."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.ingestion import Department, SourceDocument
from app.models.schemes import Benefit, EligibilityRule, RequiredDocument, Scheme, SchemeVersion
from app.services.ingestion.dedup import detect_change_kind, scheme_fingerprint, version_fingerprint
from app.services.ingestion.payload import NormalizedScheme


class SchemeWriteRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_department_id(self, code: str | None) -> UUID | None:
        if not code:
            return None
        return self.session.scalar(select(Department.id).where(Department.code == code))

    def get_by_slug(self, slug: str) -> Scheme | None:
        return self.session.scalar(select(Scheme).where(Scheme.slug == slug))

    def current_version(self, scheme: Scheme) -> SchemeVersion | None:
        if scheme.current_version_id is None:
            return None
        stmt = (
            select(SchemeVersion)
            .options(
                selectinload(SchemeVersion.benefits),
                selectinload(SchemeVersion.rules),
                selectinload(SchemeVersion.documents),
            )
            .where(SchemeVersion.id == scheme.current_version_id)
        )
        return self.session.scalar(stmt)

    def max_version_number(self, scheme_id: UUID) -> int:
        value = self.session.scalar(
            select(func.max(SchemeVersion.version_number)).where(SchemeVersion.scheme_id == scheme_id)
        )
        return int(value or 0)

    def apply(self, scheme_data: NormalizedScheme, document: SourceDocument | None) -> tuple[Scheme, int, str]:
        """Insert a new version when the fingerprint changes. Returns (scheme, versions_created, change_kind)."""
        department_id = self.get_department_id(scheme_data.department_code)
        scheme = self.get_by_slug(scheme_data.slug)
        if scheme is None:
            scheme = Scheme(
                slug=scheme_data.slug,
                code=scheme_data.code,
                category=scheme_data.category,
                status=scheme_data.status,
                department_id=department_id,
            )
            self.session.add(scheme)
            self.session.flush()

        current = self.current_version(scheme)
        incoming_hash = scheme_fingerprint(scheme_data)
        if current is not None and version_fingerprint(current) == incoming_hash:
            if scheme_data.status == "published" or scheme.status != "published":
                scheme.status = scheme_data.status
            scheme.category = scheme_data.category
            if scheme_data.code:
                scheme.code = scheme_data.code
            if department_id is not None:
                scheme.department_id = department_id
            self.session.flush()
            return scheme, 0, "UNCHANGED"
        if scheme_data.status != "published" and current is not None:
            scheme.category = scheme_data.category
            if scheme_data.code:
                scheme.code = scheme_data.code
            self.session.flush()
            return scheme, 0, "SKIPPED_THIN"

        change_kind = detect_change_kind(current, scheme_data)
        next_number = self.max_version_number(scheme.id) + 1
        now = datetime.now(UTC)
        version = SchemeVersion(
            scheme_id=scheme.id,
            version_number=next_number,
            name=scheme_data.name,
            name_hi=scheme_data.name_hi,
            summary=scheme_data.summary,
            summary_hi=scheme_data.summary_hi,
            source_url=scheme_data.source_url,
            source_document_id=None if document is None else document.id,
            retrieved_at=now if document is None else document.retrieved_at,
            last_verified_at=now,
        )
        self.session.add(version)
        self.session.flush()

        for index, rule in enumerate(scheme_data.rules):
            self.session.add(
                EligibilityRule(
                    scheme_version_id=version.id,
                    rule_key=rule.rule_key,
                    kind=rule.kind,
                    label=rule.label,
                    detail=rule.detail,
                    ast_json=rule.ast_json,
                    age_min=rule.age_min,
                    age_max=rule.age_max,
                    income_limit=rule.income_limit,
                    sort_order=rule.sort_order or index,
                )
            )
        for benefit in scheme_data.benefits:
            self.session.add(
                Benefit(
                    scheme_version_id=version.id,
                    label=benefit.label[:300],
                    label_hi=benefit.label_hi[:300],
                    amount_paise=benefit.amount_paise,
                    amount_text=benefit.amount_text[:300],
                    periodicity=benefit.periodicity,
                )
            )
        for document_need in scheme_data.documents:
            self.session.add(
                RequiredDocument(
                    scheme_version_id=version.id,
                    code=document_need.code[:64],
                    label=document_need.label[:200],
                    is_mandatory=document_need.is_mandatory,
                )
            )

        scheme.current_version_id = version.id
        scheme.status = scheme_data.status
        scheme.category = scheme_data.category
        if scheme_data.code:
            scheme.code = scheme_data.code
        if department_id is not None:
            scheme.department_id = department_id
        self.session.flush()
        return scheme, 1, change_kind
