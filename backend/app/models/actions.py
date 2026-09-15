"""Alerts, dossiers and audit trail. Guest traffic never writes a row here."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import ALERT_TYPES, AUDIT_ACTIONS, DOSSIER_STATUSES
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Alert(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "alerts"
    __table_args__ = (
        UniqueConstraint("user_id", "scheme_id", "alert_type"),
        CheckConstraint(f"alert_type IN {ALERT_TYPES}", name="alert_type"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    scheme_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("schemes.id", ondelete="SET NULL"), nullable=True, index=True
    )
    alert_type: Mapped[str] = mapped_column(String(32), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ActionDossier(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "action_dossiers"
    __table_args__ = (CheckConstraint(f"status IN {DOSSIER_STATUSES}", name="status"),)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    scheme_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("schemes.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="queued")
    storage_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    scheme_name: Mapped[str] = mapped_column(String(300), nullable=False)


class AuditLog(UUIDPrimaryKeyMixin, Base):
    """Insert-only. No updated_at — history is never rewritten."""

    __tablename__ = "audit_logs"
    __table_args__ = (CheckConstraint(f"action IN {AUDIT_ACTIONS}", name="action"),)

    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    entity_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
