"""Generic repository — the only layer that issues SQL."""

from __future__ import annotations

from typing import Generic, TypeVar
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.core.database import Base

T = TypeVar("T", bound=Base)


class BaseRepository(Generic[T]):
    def __init__(self, session: Session, model: type[T]) -> None:
        self.session = session
        self.model = model

    def get(self, id: UUID) -> T | None:
        return self.session.get(self.model, id)

    def list(self, *, offset: int = 0, limit: int = 50) -> list[T]:
        stmt: Select[tuple[T]] = select(self.model).offset(offset).limit(min(limit, 200))
        return list(self.session.scalars(stmt).all())

    def count(self) -> int:
        stmt = select(func.count()).select_from(self.model)
        return int(self.session.scalar(stmt) or 0)

    def add(self, entity: T) -> T:
        self.session.add(entity)
        return entity

    def delete(self, entity: T) -> None:
        self.session.delete(entity)
