"""Public policy/gazette pages. Fail closed if robots or HTML/PDF is empty.

Distinct circulars stay as separate policies. Clause diffs are stored only when two
versions of the same policy_code are ingested — never invented.
"""

from __future__ import annotations

from app.services.ingestion.payload import SourceSpec

POLICY_SOURCES: tuple[SourceSpec, ...] = (
    SourceSpec(
        name="e-Governance (Vikaspedia)",
        url="https://en.vikaspedia.in/viewcontent/e-governance",
        connector_type="html",
        policy_code="E-GOVERNANCE",
        issuing_body="Ministry of Electronics and Information Technology",
        gazette_ref="e-Governance programme overview",
    ),
    # Same policy_code: Digital India is the successor e-governance programme page.
    SourceSpec(
        name="Digital India (Vikaspedia)",
        url="https://en.vikaspedia.in/viewcontent/e-governance/digital-india",
        connector_type="html",
        policy_code="E-GOVERNANCE",
        issuing_body="Ministry of Electronics and Information Technology",
        gazette_ref="Digital India programme (successor e-governance framework)",
    ),
    SourceSpec(
        name="Unorganised Sector Welfare (Vikaspedia)",
        url="https://en.vikaspedia.in/viewcontent/social-welfare/unorganised-sector-1",
        connector_type="html",
        policy_code="UNORGANISED-SECTOR",
        issuing_body="Ministry of Labour and Employment",
        gazette_ref="Unorganised sector welfare overview",
    ),
    SourceSpec(
        name="NALSA legal services",
        url="https://nalsa.gov.in/",
        connector_type="html",
        policy_code="NALSA",
        issuing_body="National Legal Services Authority",
        gazette_ref="NALSA public notice",
    ),
    SourceSpec(
        name="Railway Board circulars",
        url="https://indianrailways.gov.in/railwayboard/view_section.jsp?lang=0&id=0,1,304,366,554",
        connector_type="html",
        policy_code="RAILWAY-BOARD-CIRCULARS",
        issuing_body="Ministry of Railways",
        gazette_ref="Railway Board circulars",
    ),
)
