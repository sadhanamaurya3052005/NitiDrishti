"""Auth and profile tables. No raw national ID or bank columns."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import CASTE_CATEGORIES, GENDERS, OCCUPATIONS, ROLE_CODES
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Role(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "roles"
    __table_args__ = (CheckConstraint(f"code IN {ROLE_CODES}", name="role_code"),)

    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    name_hi: Mapped[str] = mapped_column(String(80), nullable=False)


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str | None] = mapped_column(String(320), unique=True, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    profile: Mapped[UserProfile | None] = relationship(back_populates="user", uselist=False)
    roles: Mapped[list[Role]] = relationship(secondary="user_roles")


class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "role_id"),)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)


class UserProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "user_profiles"
    __table_args__ = (
        CheckConstraint("age IS NULL OR (age >= 0 AND age <= 120)", name="age_bounds"),
        CheckConstraint("income IS NULL OR income >= 0", name="income_non_negative"),
        CheckConstraint("land_hectares IS NULL OR land_hectares >= 0", name="land_non_negative"),
        CheckConstraint(f"gender IS NULL OR gender IN {GENDERS}", name="gender"),
        CheckConstraint(f"category IS NULL OR category IN {CASTE_CATEGORIES}", name="category"),
        CheckConstraint(f"occupation IS NULL OR occupation IN {OCCUPATIONS}", name="occupation"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    income: Mapped[int | None] = mapped_column(Integer, nullable=True)
    land_hectares: Mapped[float | None] = mapped_column(Float, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(16), nullable=True)
    category: Mapped[str | None] = mapped_column(String(8), nullable=True)
    occupation: Mapped[str | None] = mapped_column(String(32), nullable=True)
    state_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("states.id"), nullable=True, index=True)
    district_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("districts.id"), nullable=True, index=True)
    consent_retention: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    consent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped[User] = relationship(back_populates="profile")
