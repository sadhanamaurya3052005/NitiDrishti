"""Jobs, internships and scholarships — gazette rows only, no invented vacancies."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import RECORD_STATUSES
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Job(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "jobs"
    __table_args__ = (CheckConstraint(f"status IN {RECORD_STATUSES}", name="status"),)

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    title_hi: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    department_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("departments.id"), nullable=True, index=True)
    state_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("states.id"), nullable=True, index=True)
    source_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")


class Internship(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "internships"
    __table_args__ = (CheckConstraint(f"status IN {RECORD_STATUSES}", name="status"),)

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    title_hi: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    department_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("departments.id"), nullable=True, index=True)
    state_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("states.id"), nullable=True, index=True)
    source_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")


class Scholarship(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "scholarships"
    __table_args__ = (
        CheckConstraint(f"status IN {RECORD_STATUSES}", name="status"),
        CheckConstraint("income_limit IS NULL OR income_limit >= 0", name="income_non_negative"),
    )

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    title_hi: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    department_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("departments.id"), nullable=True, index=True)
    state_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("states.id"), nullable=True, index=True)
    source_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    income_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
