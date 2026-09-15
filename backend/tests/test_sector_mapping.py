"""Eighteen CivicMarquee sectors must map onto scheme category and ingest specs."""

from __future__ import annotations

from datetime import UTC, datetime

from app.models.enums import SCHEME_CATEGORIES
from app.services.ingestion.extractors import extract_schemes
from app.services.ingestion.hashing import sha256_text
from app.services.ingestion.opportunity_extract import extract_opportunity
from app.services.ingestion.payload import ParsedDocument, RawPayload, SourceSpec
from app.services.ingestion.registry import FIRST_CRAWL_SOURCES
from app.services.ingestion.whitelist import is_official_host

CIVIC_SECTORS = tuple(item for item in SCHEME_CATEGORIES if item != "other")


def test_scheme_categories_include_eighteen_marquee_ids() -> None:
    assert len(CIVIC_SECTORS) == 18
    assert set(CIVIC_SECTORS) <= set(SCHEME_CATEGORIES)
    assert "other" in SCHEME_CATEGORIES


def test_first_crawl_registry_names_each_sector() -> None:
    named = {spec.category for spec in FIRST_CRAWL_SOURCES if spec.category}
    missing = [sector for sector in CIVIC_SECTORS if sector not in named]
    assert missing == []
    housing = [spec for spec in FIRST_CRAWL_SOURCES if spec.category == "housing" and not spec.is_listing]
    assert housing
    assert "pmayg.dord.gov.in" in housing[0].url


def test_e_governance_registry_has_two_versions_of_same_code() -> None:
    from app.services.ingestion.policy_registry import POLICY_SOURCES

    egov = [spec for spec in POLICY_SOURCES if spec.policy_code == "E-GOVERNANCE"]
    assert len(egov) >= 2
    assert len({spec.url for spec in egov}) == len(egov)


def test_spec_category_is_preserved_for_housing() -> None:
    html = """
    <html><head><title>Pradhan Mantri Awas Yojana</title>
    <meta name="description" content="Housing assistance for eligible urban and rural households as notified by the Ministry." />
    </head><body><p>The scheme provides housing assistance for eligible families as notified in the official guidelines published by the Government of India.</p></body></html>
    """
    payload = RawPayload(
        url="https://vikaspedia.in/social-welfare/urban-poverty-alleviation-1/pradhan-mantri-awas-yojana",
        final_url="https://vikaspedia.in/social-welfare/urban-poverty-alleviation-1/pradhan-mantri-awas-yojana",
        status_code=200,
        mime_type="text/html",
        content=html.encode(),
        retrieved_at=datetime.now(UTC),
        content_hash=sha256_text(html),
    )
    parsed = ParsedDocument(payload=payload, title="Pradhan Mantri Awas Yojana", text=html, html=html)
    spec = SourceSpec(
        name="PMAY",
        url=payload.url,
        connector_type="html",
        category="housing",
        slug="pmay",
        code="PMAY",
    )
    schemes = extract_schemes(parsed, spec)
    assert len(schemes) == 1
    assert schemes[0].category == "housing"


def test_vikaspedia_subdomains_are_official() -> None:
    assert is_official_host("agriculture.vikaspedia.in")
    assert is_official_host("socialwelfare.vikaspedia.in")
    assert is_official_host("schemes.vikaspedia.in")
    assert is_official_host("vikaspedia.in")


def test_job_extract_uses_spec_name_when_pdf_title_is_notice() -> None:
    text = (
        "NOTICE\nStaff Selection Commission Constable (GD) in Central Armed Police Forces.\n"
        "The Commission will hold an open competitive examination for recruitment of Constable (GD).\n"
        "Last date to apply 31-12-2026. Vacancies are tentative as notified by the Commission."
    )
    payload = RawPayload(
        url="https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_CTGD_2026.pdf",
        final_url="https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_CTGD_2026.pdf",
        status_code=200,
        mime_type="application/pdf",
        content=text.encode(),
        retrieved_at=datetime.now(UTC),
        content_hash=sha256_text(text),
    )
    parsed = ParsedDocument(payload=payload, title="NOTICE", text=text)
    spec = SourceSpec(
        name="SSC Constable (GD) Examination notice 2026",
        url=payload.url,
        connector_type="pdf",
        opportunity_kind="job",
    )
    item = extract_opportunity(parsed, spec)
    assert item is not None
    assert item.kind == "job"
    assert item.status == "published"
    assert "Constable" in item.title
    assert item.source_url.startswith("https://ssc.gov.in")
    assert item.content_hash
