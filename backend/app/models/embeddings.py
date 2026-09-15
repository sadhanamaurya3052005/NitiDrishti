"""Reserved for semantic search. No pgvector column until that extension exists."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class DocumentEmbedding(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "document_embeddings"
    __table_args__ = (UniqueConstraint("source_document_id", "chunk_index", "model_name"),)

    source_document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("source_documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    model_name: Mapped[str] = mapped_column(String(120), nullable=False)
    dims: Mapped[int | None] = mapped_column(Integer, nullable=True)
