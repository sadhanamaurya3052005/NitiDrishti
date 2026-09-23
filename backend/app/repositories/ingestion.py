"""Source, document, and ingestion-log writes."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.ingestion import IngestionLog, Source, SourceDocument
from app.repositories.base import BaseRepository


class SourceRepository(BaseRepository[Source]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Source)

    def get_by_url(self, url: str) -> Source | None:
        return self.session.scalar(select(Source).where(Source.source_url == url))

    def upsert(
        self,
        *,
        name: str,
        url: str,
        domain: str,
        connector_type: str,
        department_id: UUID | None,
    ) -> Source:
        row = self.get_by_url(url)
        if row is None:
            row = Source(
                name=name,
                source_url=url,
                domain=domain,
                connector_type=connector_type,
                department_id=department_id,
            )
            self.add(row)
            self.session.flush()
            return row
        row.name = name
        row.connector_type = connector_type
        row.is_active = True
        if department_id is not None:
            row.department_id = department_id
        self.session.flush()
        return row

    def mark_checked(self, source: Source) -> None:
        source.last_checked_at = datetime.now(UTC)
        self.session.flush()

    def list_active(self) -> list[Source]:
        stmt = select(Source).where(Source.is_active.is_(True)).order_by(Source.name)
        return list(self.session.scalars(stmt).all())

    def latest_checked_at(self) -> datetime | None:
        return self.session.scalar(select(func.max(Source.last_checked_at)))


class SourceDocumentRepository(BaseRepository[SourceDocument]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, SourceDocument)

    def get_by_hash(self, source_id: UUID, content_hash: str) -> SourceDocument | None:
        stmt = select(SourceDocument).where(
            SourceDocument.source_id == source_id,
            SourceDocument.content_hash == content_hash,
        )
        return self.session.scalar(stmt)

    def add_document(
        self,
        *,
        source_id: UUID,
        uri: str,
        content_hash: str,
        mime_type: str | None,
        byte_size: int,
        storage_path: str | None,
        retrieved_at: datetime,
    ) -> SourceDocument:
        row = SourceDocument(
            source_id=source_id,
            uri=uri,
            content_hash=content_hash,
            mime_type=mime_type,
            byte_size=byte_size,
            storage_path=storage_path,
            retrieved_at=retrieved_at,
        )
        self.add(row)
        self.session.flush()
        return row


class IngestionLogRepository(BaseRepository[IngestionLog]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, IngestionLog)

    def start(self, source_id: UUID) -> IngestionLog:
        row = IngestionLog(source_id=source_id, started_at=datetime.now(UTC), status="running")
        self.add(row)
        self.session.flush()
        return row

    def finish(
        self,
        row: IngestionLog,
        *,
        status: str,
        http_status: int | None = None,
        error_code: str | None = None,
        detail: str | None = None,
        rows_upserted: int = 0,
        content_hash: str | None = None,
    ) -> None:
        row.finished_at = datetime.now(UTC)
        row.status = status
        row.http_status = http_status
        row.error_code = error_code
        row.detail = detail
        row.rows_upserted = rows_upserted
        row.content_hash = content_hash
        self.session.flush()

    def latest_for_source(self, source_id: UUID) -> IngestionLog | None:
        stmt = (
            select(IngestionLog)
            .where(IngestionLog.source_id == source_id)
            .order_by(IngestionLog.started_at.desc())
            .limit(1)
        )
        return self.session.scalar(stmt)

    def latest_finished_for_source(self, source_id: UUID) -> IngestionLog | None:
        stmt = (
            select(IngestionLog)
            .where(IngestionLog.source_id == source_id, IngestionLog.status != "running")
            .order_by(IngestionLog.started_at.desc())
            .limit(1)
        )
        return self.session.scalar(stmt)

    def count_failed(self) -> int:
        stmt = select(func.count()).select_from(IngestionLog).where(IngestionLog.status == "failed")
        return int(self.session.scalar(stmt) or 0)

    def latest_started_at(self) -> datetime | None:
        return self.session.scalar(select(func.max(IngestionLog.started_at)))

    def list_failed(self, *, limit: int = 50) -> list[IngestionLog]:
        stmt = (
            select(IngestionLog)
            .where(IngestionLog.status == "failed")
            .order_by(IngestionLog.started_at.desc())
            .limit(min(limit, 200))
        )
        return list(self.session.scalars(stmt).all())
