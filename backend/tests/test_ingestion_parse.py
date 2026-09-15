"""Connector parse contracts against local official-shaped fixtures."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from app.services.ingestion.extractors import extract_schemes
from app.services.ingestion.hashing import sha256_bytes
from app.services.ingestion.html import HtmlConnector
from app.services.ingestion.json_source import JsonConnector
from app.services.ingestion.payload import RawPayload, SourceSpec
from app.services.ingestion.pdf import PdfConnector
from app.services.ingestion.tabular import TabularConnector

FIXTURES = Path(__file__).parent / "fixtures"

_PDF = b"""%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length 62 >>stream
BT /F1 12 Tf 20 120 Td (PM-KISAN income support Rs. 6000 per year) Tj ET
endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
0000000379 00000 n
trailer<< /Root 1 0 R /Size 6 >>
startxref
450
%%EOF
"""


def _payload(url: str, content: bytes, mime: str) -> RawPayload:
    return RawPayload(
        url=url,
        final_url=url,
        status_code=200,
        mime_type=mime,
        content=content,
        retrieved_at=datetime.now(UTC),
        content_hash=sha256_bytes(content),
    )


def test_html_connector_extracts_title_and_benefit() -> None:
    html = (FIXTURES / "sample_scheme.html").read_bytes()
    parsed = HtmlConnector().parse(_payload("https://vikaspedia.in/schemesall/pm-kisan", html, "text/html"))
    spec = SourceSpec(
        name="PM-Kisan",
        url="https://vikaspedia.in/schemesall/pm-kisan",
        connector_type="html",
        category="agriculture",
        slug="pm-kisan",
        code="PM-KISAN",
    )
    schemes = extract_schemes(parsed, spec)
    assert len(schemes) == 1
    scheme = schemes[0]
    assert "Kisan" in scheme.name or "kisan" in scheme.name.lower()
    assert scheme.category == "agriculture"
    assert scheme.source_url.startswith("https://vikaspedia.in")
    assert scheme.benefits
    assert any(rule.kind == "age" for rule in scheme.rules) or any(rule.kind == "land" for rule in scheme.rules)


def test_json_connector_reads_scheme_list() -> None:
    raw = (FIXTURES / "sample_scheme.json").read_bytes()
    parsed = JsonConnector().parse(_payload("https://vikaspedia.in/api/schemes.json", raw, "application/json"))
    spec = SourceSpec(
        name="json",
        url="https://vikaspedia.in/api/schemes.json",
        connector_type="json",
        category="agriculture",
    )
    schemes = extract_schemes(parsed, spec)
    assert len(schemes) == 1
    assert schemes[0].code == "PM-KISAN"
    assert schemes[0].source_url.startswith("https://pmkisan.gov.in")


def test_tabular_csv_connector() -> None:
    raw = (FIXTURES / "sample_scheme.csv").read_bytes()
    parsed = TabularConnector().parse(_payload("https://vikaspedia.in/schemes.csv", raw, "text/csv"))
    spec = SourceSpec(
        name="csv",
        url="https://vikaspedia.in/schemes.csv",
        connector_type="tabular",
        category="agriculture",
    )
    schemes = extract_schemes(parsed, spec)
    assert len(schemes) == 1
    assert "Fasal" in schemes[0].name


def test_pdf_connector_extracts_text() -> None:
    parsed = PdfConnector().parse(_payload("https://vikaspedia.in/pmkisan.pdf", _PDF, "application/pdf"))
    assert "PM-KISAN" in parsed.text
    spec = SourceSpec(
        name="pdf",
        url="https://vikaspedia.in/pmkisan.pdf",
        connector_type="pdf",
        category="agriculture",
        slug="pm-kisan-pdf",
    )
    schemes = extract_schemes(parsed, spec)
    assert schemes
    assert schemes[0].slug == "pm-kisan-pdf"
