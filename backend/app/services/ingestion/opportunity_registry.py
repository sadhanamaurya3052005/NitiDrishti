"""Official opportunity pages. HTML/PDF only — skip if Playwright would be required.

UPSC robots.txt historically HTTP 403; AICTE internship URL 404. This list uses
other official recruitment notices. Fail-closed on robots 403/500.
"""

from __future__ import annotations

from app.services.ingestion.payload import SourceSpec

OPPORTUNITY_SOURCES: tuple[SourceSpec, ...] = (
    SourceSpec(
        name="Vikaspedia schemes for students (scholarship listing)",
        url="https://vikaspedia.in/schemesall/schemes-for-students",
        connector_type="html",
        opportunity_kind="scholarship",
        is_listing=True,
        department_code="MoE",
    ),
    SourceSpec(
        name="Top Class Education Scheme for SC Students",
        url="https://vikaspedia.in/schemesall/schemes-for-students/scholarship/top-class-education-scheme-for-sc-students",
        connector_type="html",
        opportunity_kind="scholarship",
        department_code="MoSJE",
    ),
    SourceSpec(
        name="National Means-cum-Merit Scholarship",
        url="https://vikaspedia.in/schemesall/schemes-for-students/scholarship/national-means-cum-merit-scholarship",
        connector_type="html",
        opportunity_kind="scholarship",
        department_code="MoE",
    ),
    SourceSpec(
        name="Urban Learning Internship Program",
        url="https://vikaspedia.in/schemesall/schemes-for-students/the-urban-learning-internship-program",
        connector_type="html",
        opportunity_kind="internship",
        department_code="MoE",
    ),
    SourceSpec(
        name="EPFO recruitments listing",
        url="https://www.epfindia.gov.in/site_en/Recruitments.php",
        connector_type="html",
        opportunity_kind="job",
        is_listing=True,
    ),
    SourceSpec(
        name="SSC Constable (GD) Examination notice 2026",
        url="https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_CTGD_2026.pdf",
        connector_type="pdf",
        opportunity_kind="job",
        department_code="MoD",
    ),
    SourceSpec(
        name="SSC Stenographer Examination notice 2026",
        url="https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_steno_2026.pdf",
        connector_type="pdf",
        opportunity_kind="job",
    ),
    SourceSpec(
        name="SSC Selection Posts Phase-XIV 2026 addendum",
        url="https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Addendum%20to%20Notice%20of%20Phase-XIV_2026-20.04.2026-updated.pdf",
        connector_type="pdf",
        opportunity_kind="job",
        department_code="MoD",
    ),
    SourceSpec(
        name="SSC CHSL 2025 final vacancies (18 June 2026)",
        url="https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/final_vacancies_18062026.pdf",
        connector_type="pdf",
        opportunity_kind="job",
    ),
    SourceSpec(
        name="EPFO SSA and Stenographer direct recruitment notice",
        url="https://www.epfindia.gov.in/site_docs/PDFs/Recruitments/SSA_Steno_Direct_Recruitment.pdf",
        connector_type="pdf",
        opportunity_kind="job",
    ),
    SourceSpec(
        name="Railway Board recruitment notices",
        url="https://indianrailways.gov.in/railwayboard/view_section.jsp?lang=0&id=0,7,1281",
        connector_type="html",
        opportunity_kind="job",
        is_listing=True,
    ),
    SourceSpec(
        name="ESIC recruitments",
        url="https://www.esic.gov.in/recruitments",
        connector_type="html",
        opportunity_kind="job",
        is_listing=True,
    ),
    SourceSpec(
        name="UIDAI current vacancies",
        url="https://uidai.gov.in/en/about-uidai/work-with-uidai/current-vacancies.html",
        connector_type="html",
        opportunity_kind="job",
    ),
    SourceSpec(
        name="DoPT vacancy circulars",
        url="https://dopt.gov.in/notifications/vacancies",
        connector_type="html",
        opportunity_kind="job",
        is_listing=True,
    ),
    SourceSpec(
        name="UPPSC advertisements",
        url="https://uppsc.up.nic.in/CandidatePages/Advertisements.aspx",
        connector_type="html",
        opportunity_kind="job",
        is_listing=True,
    ),
    SourceSpec(
        name="NCS public home (jobs if HTML)",
        url="https://www.ncs.gov.in/",
        connector_type="html",
        opportunity_kind="job",
        is_listing=True,
    ),
)

OPPORTUNITY_MAX_DISCOVERED = 12
