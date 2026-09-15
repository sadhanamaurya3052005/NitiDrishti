"""Official first-crawl registry. URLs only — facts come from the fetch.

Prefer Vikaspedia `viewcontent/schemesall/...` pages that SSR-render. Failed
fetches are logged and skipped; nothing is invented.
"""

from __future__ import annotations

from app.services.ingestion.payload import SourceSpec


def _scheme(
    *,
    name: str,
    url: str,
    category: str,
    department_code: str | None = None,
    slug: str | None = None,
    code: str | None = None,
) -> SourceSpec:
    return SourceSpec(
        name=name,
        url=url,
        connector_type="html",
        category=category,
        department_code=department_code,
        slug=slug,
        code=code,
    )


def _listing(*, name: str, url: str, category: str | None = None) -> SourceSpec:
    return SourceSpec(
        name=name,
        url=url,
        connector_type="html",
        is_listing=True,
        category=category,
    )


# Vikaspedia (MeitY / C-DAC) allows * in robots.txt. Use viewcontent URLs that
# actually return ssrPageContent; bare /schemesall/ paths often redirect empty.
FIRST_CRAWL_SOURCES: tuple[SourceSpec, ...] = (
    _listing(name="Vikaspedia schemes listing", url="https://en.vikaspedia.in/viewcontent/schemesall"),
    _listing(
        name="Vikaspedia schemes for farmers",
        url="https://en.vikaspedia.in/viewcontent/schemesall/schemes-for-farmers",
        category="agriculture",
    ),
    _listing(
        name="Vikaspedia schemes for senior citizens",
        url="https://en.vikaspedia.in/viewcontent/schemesall/schemes-for-senior-citizens",
        category="welfare",
    ),
    _listing(
        name="Vikaspedia schemes for students",
        url="https://en.vikaspedia.in/viewcontent/schemesall/schemes-for-students",
        category="education",
    ),
    _listing(
        name="Vikaspedia schemes for entrepreneurs",
        url="https://en.vikaspedia.in/viewcontent/schemesall/schemes-for-entrepreneurs",
        category="msme",
    ),
    _listing(
        name="Vikaspedia schemes for women",
        url="https://en.vikaspedia.in/viewcontent/schemesall/schemes-for-women-schemesall",
        category="women",
    ),
    _listing(
        name="Vikaspedia schemes for academicians",
        url="https://en.vikaspedia.in/viewcontent/schemesall/schemes-for-academicians",
        category="science",
    ),
    _scheme(
        name="PM-Kisan Samman Nidhi",
        url="https://en.vikaspedia.in/viewcontent/schemesall/schemes-for-farmers/pradhan-mantri-kisan-samman-nidhi",
        category="agriculture",
        department_code="MoAFW",
        slug="pm-kisan",
        code="PM-KISAN",
    ),
    _scheme(
        name="Agriculture Infrastructure Fund",
        url="https://en.vikaspedia.in/viewcontent/schemesall/schemes-for-farmers/agriculture-infrastructure-fund",
        category="agriculture",
        department_code="MoAFW",
        slug="aif",
        code="AIF",
    ),
    _scheme(
        name="Indira Gandhi National Old Age Pension Scheme",
        url="https://en.vikaspedia.in/viewcontent/schemesall/schemes-for-senior-citizens/indira-gandhi-national-old-age-pension-scheme",
        category="welfare",
        department_code="MoRD",
        slug="ignoaps",
        code="IGNOAPS",
    ),
    _scheme(
        name="Pradhan Mantri Janjati Adivasi Nyaya Maha Abhiyan",
        url="https://en.vikaspedia.in/viewcontent/schemesall/schemes-for-unemployed-and-poor/pradhan-mantri-janjati-adivasi-nyaya-maha-abhiyan",
        category="welfare",
        department_code="MoSJE",
        slug="pm-janman",
        code="PM-JANMAN",
    ),
    _scheme(
        name="National Means-cum-Merit Scholarship",
        url="https://en.vikaspedia.in/viewcontent/schemesall/schemes-for-students/scholarship/national-means-cum-merit-scholarship",
        category="education",
        department_code="MoE",
        slug="nmms",
        code="NMMS",
    ),
    _scheme(
        name="Export Promotion Mission",
        url="https://en.vikaspedia.in/viewcontent/schemesall/schemes-for-entrepreneurs/procurement-and-marketing-support/export-promotion-mission",
        category="msme",
        department_code="MoMSME",
        slug="export-promotion-mission",
        code="EPM",
    ),
    _scheme(
        name="Mission Shakti",
        url="https://en.vikaspedia.in/viewcontent/schemesall/schemes-for-women-schemesall/women-empowerment-schemes/mission-shakti",
        category="women",
        department_code="MoWCD",
        slug="mission-shakti",
        code="MISSION-SHAKTI",
    ),
    _scheme(
        name="Assistance to Training Institutions Scheme",
        url="https://en.vikaspedia.in/viewcontent/schemesall/schemes-for-entrepreneurs/skill-development-and-training/assistance-to-training-institutions-(ati)-scheme",
        category="skills",
        department_code="MoMSME",
        slug="ati-scheme",
        code="ATI",
    ),
    _scheme(
        name="Apprenticeship",
        url="https://en.vikaspedia.in/viewcontent/schemesall/schemes-for-students/apprenticeship",
        category="skills",
        department_code="MoE",
        slug="apprenticeship",
        code="NAPS",
    ),
    _scheme(
        name="Pradhan Mantri Jan Dhan Yojana",
        url="https://vikaspedia.in/social-welfare/financial-inclusion/pradhan-mantri-jan-dhan-yojana",
        category="banking",
        department_code="DFS",
        slug="pmjdy",
        code="PMJDY",
    ),
    _scheme(
        name="Atal Pension Yojana",
        url="https://en.vikaspedia.in/viewcontent/schemesall/schemes-for-unemployed-and-poor/atal-pension-yojana",
        category="banking",
        department_code="DFS",
        slug="apy",
        code="APY",
    ),
    _scheme(
        name="Ayushman Bharat",
        url="https://en.vikaspedia.in/viewcontent/schemesall/schemes-for-unemployed-and-poor/ayushman-bharat",
        category="health",
        department_code="MoHFW",
        slug="ayushman",
        code="PM-JAY",
    ),
    _scheme(
        name="PM-CARES for Children scheme",
        url="https://en.vikaspedia.in/viewcontent/schemesall/schemes-for-child/pmcares-for-children-scheme",
        category="women",
        department_code="MoWCD",
        slug="pmcares-children",
        code="PMCARES-CHILDREN",
    ),
    # Vikaspedia PMAY/IAY/RAY viewcontent URLs return empty SSR; india.gov.in and
    # mohua.gov.in robots.txt HTTP 403. MoRD PMAY-G about page is robots-allowed HTML.
    _scheme(
        name="Pradhan Mantri Awaas Yojana - Gramin",
        url="https://pmayg.dord.gov.in/netiayHome/about.aspx",
        category="housing",
        department_code="MoRD",
        slug="pmay-g",
        code="PMAY-G",
    ),
    _scheme(
        name="Cashless Treatment of Road Accident Victims Scheme",
        url="https://en.vikaspedia.in/viewcontent/schemesall/central-government-schemes/cashless-treatment-of-road-accident-victims-scheme",
        category="health",
        department_code="MoHFW",
        slug="cashless-road-accident",
        code="CTRAV",
    ),
    _scheme(
        name="Amrit Bharat Station Scheme",
        url="https://en.vikaspedia.in/viewcontent/schemesall/central-government-schemes/amrit-bharat-station-scheme",
        category="transport",
        slug="amrit-bharat-station",
        code="ABSS",
    ),
    _scheme(
        name="Mera Gaon Meri Dharohar",
        url="https://en.vikaspedia.in/viewcontent/schemesall/mera-gaon-meri-dharohar",
        category="sports",
        slug="mera-gaon-meri-dharohar",
        code="MGMD",
    ),
    _scheme(
        name="Schemes for young scientists",
        url="https://en.vikaspedia.in/viewcontent/schemesall/schemes-for-academicians/schemes-for-young-scientists",
        category="science",
        department_code="MoE",
        slug="young-scientists",
        code="YOUNG-SCIENTISTS",
    ),
    _scheme(
        name="Telecom Technology Development Fund",
        url="https://en.vikaspedia.in/viewcontent/schemesall/schemes-for-academicians/telecom-technology-development-fund-scheme",
        category="science",
        slug="ttdf",
        code="TTDF",
    ),
    _scheme(
        name="Paryatan Mitra and Paryatan Didi",
        url="https://en.vikaspedia.in/viewcontent/schemesall/central-government-schemes/paryatan-mitra-and-paryatan-didi",
        category="tourism",
        slug="paryatan-mitra",
        code="PARYATAN-MITRA",
    ),
    _scheme(
        name="Jal Jeevan Mission",
        url="https://ejalshakti.gov.in/",
        category="jal",
        slug="jal-jeevan-mission",
        code="JJM",
    ),
    _scheme(
        name="NALSA Veer Parivar Sahayata Yojana",
        url="https://en.vikaspedia.in/viewcontent/schemesall/central-government-schemes/nalsa-veer-parivar-sahayata-yojana",
        category="legal",
        slug="nalsa-veer-parivar",
        code="NALSA-VEER",
    ),
    _scheme(
        name="PM Vishwakarma Scheme 2026",
        url="https://en.vikaspedia.in/viewcontent/schemesall/pm-vishwakarma-scheme-2026",
        category="artisans",
        department_code="MoMSME",
        slug="pm-vishwakarma",
        code="PM-VISHWAKARMA",
    ),
    _scheme(
        name="PM RAHAT",
        url="https://en.vikaspedia.in/viewcontent/schemesall/central-government-schemes/pm-rahat",
        category="disaster",
        slug="pm-rahat",
        code="PM-RAHAT",
    ),
    _scheme(
        name="Atmanirbhar Bharat Rozgar Yojana",
        url="https://en.vikaspedia.in/viewcontent/schemesall/aatma-nirbhar-bharat-abhiyaan/atmanirbhar-bharat-rozgar-yojana",
        category="gig",
        slug="abry",
        code="ABRY",
    ),
    _scheme(
        name="PM SVANidhi",
        url="https://en.vikaspedia.in/viewcontent/schemesall/pm-svanidhi-scheme",
        category="gig",
        department_code="MoMSME",
        slug="pm-svanidhi",
        code="PM-SVANIDHI",
    ),
    SourceSpec(
        name="MyScheme find-scheme (JS listing; HTML fallback)",
        url="https://www.myscheme.gov.in/find-scheme",
        connector_type="html",
        is_listing=True,
    ),
)

FIRST_CRAWL_MAX_DISCOVERED = 6
