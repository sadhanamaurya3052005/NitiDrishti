"""Ingestion pipeline for official government sources."""

from app.services.ingestion.pipeline import SchemeIngestionService
from app.services.ingestion.registry import FIRST_CRAWL_SOURCES

__all__ = ["FIRST_CRAWL_SOURCES", "SchemeIngestionService"]
