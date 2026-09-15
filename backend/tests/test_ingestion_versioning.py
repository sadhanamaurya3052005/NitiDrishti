"""Hash dedup and immutable versioning against PostgreSQL. Rolled back."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

import pytest
from sqlalchemy import inspect, select

from app.core.database import SessionLocal, check_connection, engine
from app.models.schemes import Scheme, SchemeVersion
from app.services.ingestion.hashing import sha256_bytes
from app.services.ingestion.payload import (
    NormalizedBenefit,
    NormalizedScheme,
    RawPayload,
    SourceSpec,
)
from app.services.ingestion.pipeline import SchemeIngestionService
from app.services.ingestion.versioning import SchemeWriteRepository

FIXTURES = Path(__file__).parent / "fixtures"


def _tables_ready() -> bool:
    if not check_connection()["connected"]:
        return False
    inspector = inspect(engine)
    return inspector.has_table("schemes") and inspector.has_table("source_documents")


@pytest.fixture
def session():
    if not _tables_ready():
        pytest.skip("production schema is not migrated yet")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


def _scheme(name: str, summary: str, slug: str = "block-b-test-scheme") -> NormalizedScheme:
    return NormalizedScheme(
        slug=slug,
        code="BLOCK-B-TEST",
        name=name,
        name_hi=name,
        summary=summary,
        summary_hi=summary,
        category="agriculture",
        source_url="https://vikaspedia.in/block-b-test-scheme",
        status="published",
        benefits=[
            NormalizedBenefit(label="₹6,000", label_hi="₹6,000", amount_text="₹6,000", amount_paise=600000)
        ],
    )


def test_new_scheme_inserts_version_one(session) -> None:
    writer = SchemeWriteRepository(session)
    scheme, created, kind = writer.apply(_scheme("PM Test", "First gazette snapshot for farmers."), None)
    assert created == 1
    assert kind == "NEW"
    assert scheme.current_version_id is not None
    versions = list(session.scalars(select(SchemeVersion).where(SchemeVersion.scheme_id == scheme.id)).all())
    assert [item.version_number for item in versions] == [1]
    assert versions[0].name == "PM Test"


def test_same_fingerprint_does_not_create_another_version(session) -> None:
    writer = SchemeWriteRepository(session)
    first = _scheme("PM Test", "First gazette snapshot for farmers.")
    scheme, created, _kind = writer.apply(first, None)
    assert created == 1
    _, created_again, kind = writer.apply(first, None)
    assert created_again == 0
    assert kind == "UNCHANGED"
    versions = list(session.scalars(select(SchemeVersion).where(SchemeVersion.scheme_id == scheme.id)).all())
    assert len(versions) == 1


def test_changed_content_inserts_immutable_v2(session) -> None:
    writer = SchemeWriteRepository(session)
    scheme, _, _ = writer.apply(_scheme("PM Test", "First gazette snapshot for farmers."), None)
    v1_id = scheme.current_version_id
    v1 = session.get(SchemeVersion, v1_id)
    assert v1 is not None
    original_name = v1.name

    scheme, created, kind = writer.apply(
        _scheme("PM Test updated", "Second gazette snapshot with a revised summary for farmers."),
        None,
    )
    assert created == 1
    assert kind in {"UPDATED", "BENEFIT_CHANGED", "ELIGIBILITY_CHANGED"}
    v2 = session.get(SchemeVersion, scheme.current_version_id)
    assert v2 is not None
    assert v2.version_number == 2
    assert v2.id != v1_id
    assert session.get(SchemeVersion, v1_id).name == original_name
    assert v2.name == "PM Test updated"


def test_pipeline_skips_duplicate_content_hash(session) -> None:
    html = (FIXTURES / "sample_scheme.html").read_bytes()
    url = "https://vikaspedia.in/block-b-pipeline-dedup"
    payload = RawPayload(
        url=url,
        final_url=url,
        status_code=200,
        mime_type="text/html",
        content=html,
        retrieved_at=datetime.now(UTC),
        content_hash=sha256_bytes(html),
    )

    def retrieve(_url: str) -> RawPayload:
        return payload

    spec = SourceSpec(
        name="Pipeline dedup",
        url=url,
        connector_type="html",
        category="agriculture",
        slug="block-b-pipeline-dedup",
        code="BLOCK-B-DEDUP",
    )
    service = SchemeIngestionService(session, retrieve_fn=retrieve)
    first = service.ingest_source(spec)
    second = service.ingest_source(spec)
    assert first.status == "ok"
    assert first.rows_upserted == 1
    assert first.versions_created == 1
    assert second.status == "ok"
    assert second.unchanged is True
    assert second.versions_created == 0
    scheme = session.scalar(select(Scheme).where(Scheme.slug == "block-b-pipeline-dedup"))
    assert scheme is not None
    versions = list(session.scalars(select(SchemeVersion).where(SchemeVersion.scheme_id == scheme.id)).all())
    assert len(versions) == 1


def test_two_policy_versions_store_a_real_diff(session) -> None:
    import uuid

    from app.models.policy import Policy, PolicyChange, PolicyVersion
    from app.services.ingestion.policy_pipeline import PolicyIngestionService

    token = uuid.uuid4().hex[:10]
    code = f"TEST-NEG-DIFF-{token}"
    html_v1 = (
        "<html><head><title>NeGP circular fixture</title></head><body>"
        "<p>Clause 1. Citizen services shall be delivered through notified CSCs at 10 rupees.</p>"
        "</body></html>"
    )
    html_v2 = (
        "<html><head><title>NeGP circular fixture</title></head><body>"
        "<p>Clause 1. Citizen services shall be delivered through notified CSCs at 20 rupees.</p>"
        "</body></html>"
    )

    def retrieve(url: str) -> RawPayload:
        body = html_v1 if url.endswith("/v1") else html_v2
        return RawPayload(
            url=url,
            final_url=url,
            status_code=200,
            mime_type="text/html",
            content=body.encode(),
            retrieved_at=datetime.now(UTC),
            content_hash=sha256_bytes(body.encode()),
        )

    service = PolicyIngestionService(session, retrieve_fn=retrieve)
    first = service.ingest_source(
        SourceSpec(
            name="NeGP v1",
            url=f"https://vikaspedia.in/e-governance/fixture-diff-{token}/v1",
            connector_type="html",
            policy_code=code,
            issuing_body="Fixture",
            gazette_ref="v1",
        )
    )
    second = service.ingest_source(
        SourceSpec(
            name="NeGP v2",
            url=f"https://vikaspedia.in/e-governance/fixture-diff-{token}/v2",
            connector_type="html",
            policy_code=code,
            issuing_body="Fixture",
            gazette_ref="v2",
        )
    )
    assert first.status == "ok" and first.versions_created == 1
    assert second.status == "ok" and second.versions_created == 1
    policy = session.scalar(select(Policy).where(Policy.code == code))
    assert policy is not None
    versions = list(session.scalars(select(PolicyVersion).where(PolicyVersion.policy_id == policy.id)).all())
    assert sorted(item.version_number for item in versions) == [1, 2]
    older = min(versions, key=lambda item: item.version_number)
    newer = max(versions, key=lambda item: item.version_number)
    changes = list(
        session.scalars(
            select(PolicyChange).where(
                PolicyChange.from_version_id == older.id,
                PolicyChange.to_version_id == newer.id,
            )
        ).all()
    )
    assert changes
    assert any(row.change_kind in {"numeric", "amended"} for row in changes)
