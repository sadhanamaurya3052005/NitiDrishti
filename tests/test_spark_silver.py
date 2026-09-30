"""Pure-Python SILVER normalization tests (no Spark cluster required)."""

from __future__ import annotations

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "backend"))
sys.path.insert(0, str(REPO))

from spark_jobs.normalize_silver import normalize_row, _run_python  # noqa: E402


def test_unicode_devanagari_preserved() -> None:
    row = {
        "document_id": "1",
        "source_id": "s1",
        "content_hash": "abc",
        "uri": "https://vikaspedia.in/कृषि",
        "mime_type": "text/html; charset=utf-8",
        "domain": "vikaspedia.in",
        "source_url": "https://vikaspedia.in/कृषि",
        "byte_size": 10,
        "storage_path": "storage/raw/x",
        "retrieved_at": "2026-01-01T00:00:00+00:00",
    }
    out = normalize_row(row)
    assert "कृषि" in out["uri"]
    assert out["domain_norm"] == "vikaspedia.in"
    assert out["mime_norm"] == "text/html"
    assert out["row_hash"]


def test_duplicate_content_hash_dropped() -> None:
    rows = [
        {
            "document_id": "1",
            "source_id": "s1",
            "content_hash": "same",
            "uri": "a",
            "mime_type": "text/html",
            "domain": "GOV.IN",
            "source_url": "https://example.gov.in",
            "byte_size": 1,
            "storage_path": "p",
            "retrieved_at": None,
        },
        {
            "document_id": "2",
            "source_id": "s1",
            "content_hash": "same",
            "uri": "b",
            "mime_type": "text/html",
            "domain": "gov.in",
            "source_url": "https://example.gov.in",
            "byte_size": 1,
            "storage_path": "p",
            "retrieved_at": None,
        },
    ]
    out = _run_python(rows)
    assert len(out) == 1


def test_null_domain_safe() -> None:
    row = {
        "document_id": "1",
        "source_id": "s1",
        "content_hash": "h",
        "uri": None,
        "mime_type": None,
        "domain": None,
        "source_url": None,
        "byte_size": 0,
        "storage_path": None,
        "retrieved_at": None,
    }
    out = normalize_row(row)
    assert out["domain_norm"] == ""
    assert out["mime_norm"] == "application/octet-stream"
