"""JSON / official structured-data connector."""

from __future__ import annotations

import json
from typing import Any

from app.core.exceptions import ValidationError
from app.services.ingestion.base import SourceConnector
from app.services.ingestion.payload import ParsedDocument, RawPayload


class JsonConnector(SourceConnector):
    connector_type = "json"

    def parse(self, payload: RawPayload) -> ParsedDocument:
        try:
            data = json.loads(payload.content.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValidationError("Response is not valid JSON") from exc

        rows: list[dict[str, Any]] = []
        if isinstance(data, list):
            rows = [item for item in data if isinstance(item, dict)]
        elif isinstance(data, dict):
            for key in ("schemes", "data", "items", "results"):
                value = data.get(key)
                if isinstance(value, list):
                    rows = [item for item in value if isinstance(item, dict)]
                    break
            if not rows:
                rows = [data]

        text_parts: list[str] = []
        for row in rows:
            for key in ("name", "title", "summary", "description"):
                value = row.get(key)
                if isinstance(value, str) and value.strip():
                    text_parts.append(value.strip())
        return ParsedDocument(
            payload=payload,
            title=_title_of(rows),
            text="\n".join(text_parts),
            json_data=data,
            rows=rows,
        )


def _title_of(rows: list[dict[str, Any]]) -> str | None:
    if not rows:
        return None
    first = rows[0]
    for key in ("name", "title"):
        value = first.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None
