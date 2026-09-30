"""Ingestion pipeline for official government sources.

Keep this package init light so leaf modules (hashing, normalize, object_store)
can be imported from Spark/dbt stage runners without pulling connectors.
"""

from __future__ import annotations

__all__ = ["FIRST_CRAWL_SOURCES", "SchemeIngestionService"]


def __getattr__(name: str):
    if name == "SchemeIngestionService":
        from app.services.ingestion.pipeline import SchemeIngestionService

        return SchemeIngestionService
    if name == "FIRST_CRAWL_SOURCES":
        from app.services.ingestion.registry import FIRST_CRAWL_SOURCES

        return FIRST_CRAWL_SOURCES
    raise AttributeError(name)
