"""Map connector_type to a fetcher instance."""

from __future__ import annotations

from app.core.exceptions import ValidationError
from app.services.ingestion.base import SourceConnector, retrieve
from app.services.ingestion.dynamic import DynamicConnector
from app.services.ingestion.html import HtmlConnector
from app.services.ingestion.http import RetrieveFn
from app.services.ingestion.json_source import JsonConnector
from app.services.ingestion.pdf import PdfConnector
from app.services.ingestion.tabular import TabularConnector


def connector_for(connector_type: str, retrieve_fn: RetrieveFn = retrieve) -> SourceConnector:
    mapping: dict[str, type[SourceConnector]] = {
        "html": HtmlConnector,
        "dynamic": DynamicConnector,
        "pdf": PdfConnector,
        "tabular": TabularConnector,
        "json": JsonConnector,
    }
    cls = mapping.get(connector_type)
    if cls is None:
        raise ValidationError(f"Unknown connector_type: {connector_type}")
    return cls(retrieve_fn)
