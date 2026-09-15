"""Official administrative geography. Seeded from LGD reference names, not invented counts."""

from __future__ import annotations

import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import STATE_KINDS
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class State(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "states"
    __table_args__ = (CheckConstraint(f"kind IN {STATE_KINDS}", name="kind"),)

    lgd_code: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    iso_code: Mapped[str] = mapped_column(String(8), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    name_hi: Mapped[str] = mapped_column(String(80), nullable=False)
    kind: Mapped[str] = mapped_column(String(8), nullable=False)

    districts: Mapped[list[District]] = relationship(back_populates="state")


class District(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "districts"
    __table_args__ = (UniqueConstraint("state_id", "name"),)

    state_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("states.id"), nullable=False, index=True)
    lgd_code: Mapped[int | None] = mapped_column(Integer, unique=True, nullable=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    name_hi: Mapped[str] = mapped_column(String(120), nullable=False)

    state: Mapped[State] = relationship(back_populates="districts")
