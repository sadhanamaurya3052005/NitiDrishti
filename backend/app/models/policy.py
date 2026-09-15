"""Nyay-Mitra policy versions. Old gazettes stay immutable."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import CHANGE_KINDS
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Policy(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "policies"

    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(400), nullable=False)
    title_hi: Mapped[str] = mapped_column(String(400), nullable=False, default="")
    issuing_body: Mapped[str] = mapped_column(String(300), nullable=False)
    current_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("policy_versions.id", use_alter=True, name="fk_policies_current_version"),
        nullable=True,
    )

    versions: Mapped[list[PolicyVersion]] = relationship(
        back_populates="policy",
        foreign_keys="PolicyVersion.policy_id",
    )


class PolicyVersion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "policy_versions"
    __table_args__ = (
        UniqueConstraint("policy_id", "version_number"),
        CheckConstraint(
            "effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from",
            name="effective_window",
        ),
    )

    policy_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("policies.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    gazette_ref: Mapped[str | None] = mapped_column(String(200), nullable=True)
    source_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    source_document_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("source_documents.id"), nullable=True, index=True
    )
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    effective_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    effective_to: Mapped[date | None] = mapped_column(Date, nullable=True)

    policy: Mapped[Policy] = relationship(back_populates="versions", foreign_keys=[policy_id])
    clauses: Mapped[list[PolicyClause]] = relationship(back_populates="policy_version")


class PolicyClause(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "policy_clauses"

    policy_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("policy_versions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    clause_ref: Mapped[str] = mapped_column(String(64), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    page_no: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    policy_version: Mapped[PolicyVersion] = relationship(back_populates="clauses")


class PolicyChange(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "policy_changes"
    __table_args__ = (CheckConstraint(f"change_kind IN {CHANGE_KINDS}", name="change_kind"),)

    from_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("policy_versions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    to_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("policy_versions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    change_kind: Mapped[str] = mapped_column(String(16), nullable=False)
    clause_ref: Mapped[str | None] = mapped_column(String(64), nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    numeric_old: Mapped[float | None] = mapped_column(nullable=True)
    numeric_new: Mapped[float | None] = mapped_column(nullable=True)
