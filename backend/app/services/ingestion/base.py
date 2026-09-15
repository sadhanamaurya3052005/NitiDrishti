"""Connector contract and guarded retrieve used by every fetcher."""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.services.ingestion.http import download
from app.services.ingestion.payload import ParsedDocument, RawPayload
from app.services.ingestion.robots import assert_robots_allowed
from app.services.ingestion.whitelist import assert_whitelisted


def retrieve(url: str) -> RawPayload:
    """Whitelist + robots.txt + HTTP GET. The only live fetch used by HTML/PDF/JSON/tabular."""
    assert_whitelisted(url)
    assert_robots_allowed(url)
    return download(url)


class SourceConnector(ABC):
    connector_type: str

    def __init__(self, retrieve_fn=retrieve) -> None:
        self.retrieve_fn = retrieve_fn

    def fetch(self, url: str) -> RawPayload:
        return self.retrieve_fn(url)

    @abstractmethod
    def parse(self, payload: RawPayload) -> ParsedDocument:
        raise NotImplementedError
