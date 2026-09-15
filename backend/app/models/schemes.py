"""Scheme catalog and immutable versions. Updates always insert a new version row."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import RECORD_STATUSES, RULE_KINDS, SCHEME_CATEGORIES
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Scheme(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "schemes"
    __table_args__ = (
        CheckConstraint(f"status IN {RECORD_STATUSES}", name="status"),
        CheckConstraint(f"category IN {SCHEME_CATEGORIES}", name="category"),
    )

    code: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft", index=True)
    department_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("departments.id"), nullable=True, index=True)
    state_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("states.id"), nullable=True, index=True)
    current_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("scheme_versions.id", use_alter=True, name="fk_schemes_current_version"),
        nullable=True,
    )

    versions: Mapped[list[SchemeVersion]] = relationship(
        back_populates="scheme",
        foreign_keys="SchemeVersion.scheme_id",
    )


class SchemeVersion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "scheme_versions"
    __table_args__ = (
        UniqueConstraint("scheme_id", "version_number"),
        CheckConstraint(
            "effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from",
            name="effective_window",
        ),
    )

    scheme_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("schemes.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    name_hi: Mapped[str] = mapped_column(String(300), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    summary_hi: Mapped[str] = mapped_column(Text, nullable=False, default="")
    source_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    source_document_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("source_documents.id"), nullable=True, index=True
    )
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    effective_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    effective_to: Mapped[date | None] = mapped_column(Date, nullable=True)

    scheme: Mapped[Scheme] = relationship(back_populates="versions", foreign_keys=[scheme_id])
    rules: Mapped[list[EligibilityRule]] = relationship(back_populates="scheme_version")
    benefits: Mapped[list[Benefit]] = relationship(back_populates="scheme_version")
    documents: Mapped[list[RequiredDocument]] = relationship(back_populates="scheme_version")


class EligibilityRule(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "eligibility_rules"
    __table_args__ = (
        CheckConstraint(f"kind IN {RULE_KINDS}", name="kind"),
        CheckConstraint("age_min IS NULL OR age_max IS NULL OR age_min <= age_max", name="age_range"),
        CheckConstraint("income_limit IS NULL OR income_limit >= 0", name="income_non_negative"),
    )

    scheme_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("scheme_versions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rule_key: Mapped[str] = mapped_column(String(64), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    label: Mapped[str] = mapped_column(String(300), nullable=False)
    detail: Mapped[str] = mapped_column(Text, nullable=False, default="")
    ast_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    age_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    age_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    income_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    scheme_version: Mapped[SchemeVersion] = relationship(back_populates="rules")


class Benefit(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "benefits"

    scheme_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("scheme_versions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[str] = mapped_column(String(300), nullable=False)
    label_hi: Mapped[str] = mapped_column(String(300), nullable=False)
    amount_paise: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    amount_text: Mapped[str] = mapped_column(String(300), nullable=False)
    periodicity: Mapped[str | None] = mapped_column(String(64), nullable=True)

    scheme_version: Mapped[SchemeVersion] = relationship(back_populates="benefits")


class RequiredDocument(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Document *types* a scheme asks for — never the citizen's identity digits."""

    __tablename__ = "required_documents"

    scheme_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("scheme_versions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    is_mandatory: Mapped[bool] = mapped_column(nullable=False, default=True, server_default="true")

    scheme_version: Mapped[SchemeVersion] = relationship(back_populates="documents")
