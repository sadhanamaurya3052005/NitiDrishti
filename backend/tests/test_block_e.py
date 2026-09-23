"""Public reads: opportunities, policies, analytics, keyword assistant."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.core.database import check_connection
from app.main import app
from app.services.ingestion.hashing import sha256_text
from app.services.ingestion.payload import ParsedDocument, RawPayload, SourceSpec
from app.services.ingestion.policy_diff import diff_clauses
from app.services.ingestion.policy_extract import extract_policy

client = TestClient(app)


@pytest.mark.skipif(not check_connection()["connected"], reason="PostgreSQL not reachable")
def test_opportunities_list_uses_envelope() -> None:
    response = client.get("/api/v1/opportunities")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["error"] is None
    data = body["data"]
    assert isinstance(data["items"], list)
    assert isinstance(data["jobs"], list)
    assert isinstance(data["internships"], list)
    assert isinstance(data["scholarships"], list)
    for key in ("jobs", "internships", "scholarships"):
        assert key in data["counts"]
        assert isinstance(data["counts"][key], int)
    for item in data["items"]:
        assert item["status"] == "published"
        assert item["source_url"]
        assert item["retrieved_at"]
        assert item["kind"] in {"job", "internship", "scholarship"}


@pytest.mark.skipif(not check_connection()["connected"], reason="PostgreSQL not reachable")
def test_jobs_internships_scholarships_are_empty_or_real() -> None:
    jobs = client.get("/api/v1/jobs").json()["data"]["jobs"]
    internships = client.get("/api/v1/internships").json()["data"]["internships"]
    scholarships = client.get("/api/v1/scholarships").json()["data"]["scholarships"]
    assert isinstance(jobs, list)
    assert isinstance(internships, list)
    assert isinstance(scholarships, list)


@pytest.mark.skipif(not check_connection()["connected"], reason="PostgreSQL not reachable")
def test_policies_list_and_missing_compare() -> None:
    response = client.get("/api/v1/policies")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert isinstance(body["data"]["policies"], list)
    missing = client.get("/api/v1/policies/not-a-real-policy/compare")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.skipif(not check_connection()["connected"], reason="PostgreSQL not reachable")
def test_analytics_summary_is_honest() -> None:
    response = client.get("/api/v1/analytics/summary")
    assert response.status_code == 200
    data = response.json()["data"]
    for key in ("published_schemes", "jobs", "internships", "scholarships", "policies"):
        assert isinstance(data[key], int)
        assert data[key] >= 0
    assert isinstance(data["application_rows"], bool)
    assert data["pgvector_enabled"] is False
    assert isinstance(data["postgis_enabled"], bool)
    assert data["map"]["available"] is True
    for stage in data["funnel"]:
        if data["application_rows"]:
            assert isinstance(stage["count"], int)
            assert stage["count"] >= 0
        else:
            assert stage["count"] is None
    csc = client.get("/api/v1/csc/summary")
    welfare = client.get("/api/v1/welfare/summary")
    assert csc.status_code == 200
    assert welfare.status_code == 200
    assert csc.json()["data"]["workspace"] == "csc"
    if not data["application_rows"]:
        assert welfare.json()["data"]["funnel"][0]["count"] is None


@pytest.mark.skipif(not check_connection()["connected"], reason="PostgreSQL not reachable")
def test_assistant_does_not_decide_eligibility() -> None:
    response = client.post("/api/v1/assistant/ask", json={"query": "Am I eligible for PM-Kisan?"})
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["decides_eligibility"] is False
    assert data["semantic_available"] is False
    assert data["mode"] == "keyword"
    assert data["citations"] == []


@pytest.mark.skipif(not check_connection()["connected"], reason="PostgreSQL not reachable")
def test_assistant_empty_query_is_validation() -> None:
    response = client.post("/api/v1/assistant/ask", json={"query": "   "})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_policy_extract_and_diff_use_source_text_only() -> None:
    html = """
    <html><head><title>Digital Public Test Policy</title></head>
    <body>
    <p>Clause 1. Citizens may access authenticated public services through a notified portal.</p>
    <p>Clause 2. Income support of 6000 rupees is mentioned in this fixture only.</p>
    </body></html>
    """
    payload = RawPayload(
        url="https://vikaspedia.in/e-governance/digital-india/digital-india-programme",
        final_url="https://vikaspedia.in/e-governance/digital-india/digital-india-programme",
        status_code=200,
        mime_type="text/html",
        content=html.encode(),
        retrieved_at=datetime.now(UTC),
        content_hash=sha256_text(html),
    )
    parsed = ParsedDocument(payload=payload, title="Digital Public Test Policy", text=html, html=html)
    spec = SourceSpec(
        name="fixture",
        url=payload.url,
        connector_type="html",
        policy_code="TEST-POL",
        issuing_body="Fixture",
    )
    policy = extract_policy(parsed, spec)
    assert policy is not None
    assert "notified portal" in " ".join(item.text for item in policy.clauses)

    class _Clause:
        def __init__(self, ref: str, text: str) -> None:
            self.clause_ref = ref
            self.text = text

    changes = diff_clauses(
        [_Clause("1", "Income support of 6000 rupees")],  # type: ignore[list-item]
        [_Clause("1", "Income support of 8000 rupees")],  # type: ignore[list-item]
    )
    assert changes
    assert changes[0]["change_kind"] in {"numeric", "amended"}
    assert "9000" not in changes[0]["summary"]


def test_pick_in_force_uses_effective_window() -> None:
    from datetime import date

    from app.services.policies import pick_in_force

    class _Version:
        def __init__(self, number: int, start: date | None, end: date | None) -> None:
            self.version_number = number
            self.effective_from = start
            self.effective_to = end

    old = _Version(1, date(2020, 1, 1), date(2023, 12, 31))
    new = _Version(2, date(2024, 1, 1), None)
    assert pick_in_force([old, new], date(2022, 6, 1)).version_number == 1  # type: ignore[union-attr]
    assert pick_in_force([old, new], date(2025, 1, 1)).version_number == 2  # type: ignore[union-attr]
    assert pick_in_force([old], date(2019, 1, 1)) is None


@pytest.mark.skipif(not check_connection()["connected"], reason="PostgreSQL not reachable")
def test_policy_compare_echoes_as_of() -> None:
    listed = client.get("/api/v1/policies").json()["data"]["policies"]
    if not listed:
        pytest.skip("no ingested policies")
    policy_id = listed[0]["id"]
    response = client.get(f"/api/v1/policies/{policy_id}/compare", params={"as_of": "2024-06-01"})
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["asOf"] == "2024-06-01"
    assert "to_version" in data
    if data["to_version"]:
        assert "effective_from" in data["to_version"]
        assert "effective_to" in data["to_version"]
    if data.get("from_version") and data.get("to_version") and data["from_version"]["id"] == data["to_version"]["id"]:
        assert data["note"] == "This date is covered by the same ingested version as the current gazette."
