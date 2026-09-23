"""Citizen/CSC application rows. Guests never insert here. No identity digits."""

from __future__ import annotations

import uuid

from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import APPLICATION_STAGES
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Application(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "applications"
    __table_args__ = (CheckConstraint(f"stage IN {APPLICATION_STAGES}", name="stage"),)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    scheme_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("schemes.id", ondelete="CASCADE"), nullable=False, index=True)
    district_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("districts.id", ondelete="SET NULL"), nullable=True, index=True
    )
    stage: Mapped[str] = mapped_column(String(32), nullable=False, default="Submitted")
