"""Workspace honesty endpoints: real counts or explicit absence. Never fake KPIs."""

from __future__ import annotations

from collections import Counter
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, ForbiddenError, NotFoundError, ValidationError
from app.core.rbac import has_any_role
from app.models.actions import Alert
from app.models.enums import ALERT_TYPES
from app.models.identity import User, UserProfile
from app.models.opportunities import Internship, Job, Scholarship
from app.models.schemes import Scheme
from app.repositories.alerts import AlertRepository
from app.repositories.analytics import AnalyticsRepository
from app.repositories.opportunities import (
    InternshipRepository,
    JobRepository,
    ScholarshipRepository,
)
from app.repositories.policies import PolicyRepository, PolicyVersionRepository
from app.repositories.schemes import SchemeRepository
from app.repositories.users import UserRepository

FUNNEL_STAGES = (
    "Discovered",
    "Submitted",
    "Tehsil Verified",
    "Sanctioned",
    "DBT Disbursed",
)

DISTRICT_METRICS = (
    "coverage_saturation",
    "application_dropoff",
    "cohort_gap",
    "disbursement_velocity",
)

MIN_COHORT_ROWS = 5
AGE_BINS = ((0, 17), (18, 29), (30, 44), (45, 59), (60, 120))
INCOME_BINS = ((0, 99_999), (100_000, 249_999), (250_000, 499_999), (500_000, 799_999), (800_000, None))
AGE_LABELS = ("0-17", "18-29", "30-44", "45-59", "60+")
INCOME_LABELS = ("< Rs 1L", "Rs 1-2.5L", "Rs 2.5-5L", "Rs 5-8L", "Rs 8L+")

_NO_PIPELINE = "No application-pipeline data for this district"
_NO_REGISTRY = "Not tracked (no application registry)"
_NO_DBT = "No fund-disbursement / DBT table."
_NO_DROP = "No application-pipeline table. Drop-off is not computed."
_COVERAGE_BASIS = (
    "Published schemes available to this state (state-linked plus national catalog) "
    "as a share of the state with the most such schemes. Not beneficiary coverage."
)


class AnalyticsService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.analytics = AnalyticsRepository(session)
        self.schemes = SchemeRepository(session)
        self.jobs = JobRepository(session)
        self.internships = InternshipRepository(session)
        self.scholarships = ScholarshipRepository(session)
        self.policies = PolicyRepository(session)
        self.policy_versions = PolicyVersionRepository(session)
        self.users = UserRepository(session)
        self.alerts = AlertRepository(session)

    def summary(self) -> dict:
        postgis = self.analytics.extension_enabled("postgis")
        pgvector = self.analytics.extension_enabled("vector")
        ingest = self.analytics.ingestion_status_counts()
        return {
            "published_schemes": self.schemes.published_count(),
            "scheme_versions": self.analytics.scheme_version_count(),
            "jobs": self.jobs.published_count(),
            "internships": self.internships.published_count(),
            "scholarships": self.scholarships.published_count(),
            "policies": self.policies.published_count(),
            "policy_versions": self.policy_versions.count_all(),
            "ingestion": {
                "ok": ingest.get("ok", 0),
                "failed": ingest.get("failed", 0),
                "running": ingest.get("running", 0),
                "recent": self.analytics.recent_ingestion(),
            },
            "postgis_enabled": postgis,
            "pgvector_enabled": pgvector,
            "application_rows": False,
            "map": {
                "available": postgis,
                "reason": None if postgis else "PostGIS is not installed. No district geometry is served.",
            },
            "district_analytics": {
                "endpoint": "/api/v1/analytics/districts",
                "geometry": "Client GeoJSON joined by district name and state. PostGIS is not used.",
            },
            "funnel": [{"stage": stage, "count": None} for stage in FUNNEL_STAGES],
        }

    def csc_summary(self) -> dict:
        data = self.summary()
        data["workspace"] = "csc"
        data["kiosk_queue"] = "device-local IndexedDB. Server does not store guest intake rows."
        return data

    def welfare_summary(self) -> dict:
        data = self.summary()
        data["workspace"] = "welfare"
        data["note"] = (
            "Funnel counts stay null until official application rows exist. "
            "No beneficiary or vacancy figures are invented. "
            "District choropleth uses /api/v1/analytics/districts."
        )
        return data

    def districts(self, *, state_id: str | None = None, metric: str = "coverage_saturation") -> dict:
        chosen = (metric or "coverage_saturation").strip()
        if chosen not in DISTRICT_METRICS:
            raise ValidationError(f"metric must be one of {', '.join(DISTRICT_METRICS)}")
        parsed_state = _optional_uuid(state_id, "state_id")

        states = self.analytics.list_states()
        rows = self.analytics.list_districts(parsed_state)
        schemes_by_state = self.analytics.published_count_by_state(Scheme)
        jobs_by_state = self.analytics.published_count_by_state(Job)
        internships_by_state = self.analytics.published_count_by_state(Internship)
        scholarships_by_state = self.analytics.published_count_by_state(Scholarship)
        national_schemes = self.analytics.published_national_count(Scheme)
        profiles = self.analytics.consented_profiles()
        profiles_by_district: dict[UUID, list[UserProfile]] = {}
        for profile in profiles:
            if profile.district_id is None:
                continue
            profiles_by_district.setdefault(profile.district_id, []).append(profile)
        dossier_counts = self.analytics.dossier_counts_by_district()
        alert_counts = self.analytics.alert_counts_by_district()

        state_ids = {state.id for state in states}
        catalog_by_state = {
            sid: schemes_by_state.get(sid, 0) + national_schemes for sid in state_ids
        }
        max_state_schemes = max(catalog_by_state.values(), default=0)
        coverage_available = max_state_schemes > 0
        district_gaps = {
            district_id: _cohort_gap(items) for district_id, items in profiles_by_district.items()
        }
        cohort_available = any(value is not None for value in district_gaps.values())

        metric_meta = {
            "coverage_saturation": {
                "available": coverage_available,
                "reason": _COVERAGE_BASIS
                if coverage_available
                else "No state-linked published schemes, so catalog saturation is not computed.",
            },
            "application_dropoff": {"available": False, "reason": _NO_DROP},
            "cohort_gap": {
                "available": cohort_available,
                "reason": (
                    "Share imbalance among consented profiles with gender or category "
                    f"(minimum {MIN_COHORT_ROWS} rows in the district). No PII is returned."
                    if cohort_available
                    else (
                        f"Fewer than {MIN_COHORT_ROWS} consented profiles with gender or "
                        "category in any district."
                    )
                ),
            },
            "disbursement_velocity": {"available": False, "reason": _NO_DBT},
        }
        selected_meta = metric_meta[chosen]

        districts_out: list[dict] = []
        for district, state in rows:
            scheme_n = schemes_by_state.get(state.id, 0)
            catalog_n = catalog_by_state.get(state.id, national_schemes)
            coverage_pct = round(100.0 * catalog_n / max_state_schemes, 1) if coverage_available else None
            gap_pct = district_gaps.get(district.id)
            consented_n = len(profiles_by_district.get(district.id, []))
            saturation = _saturation_for_metric(
                chosen,
                coverage_pct=coverage_pct,
                gap_pct=gap_pct,
                coverage_available=coverage_available,
                cohort_available=cohort_available,
            )
            districts_out.append(
                {
                    "id": str(district.id),
                    "name": district.name,
                    "name_hi": district.name_hi,
                    "lgd_code": district.lgd_code,
                    "state_id": str(state.id),
                    "state_name": state.name,
                    "state_name_hi": state.name_hi,
                    "state_iso": state.iso_code,
                    "saturation_pct": saturation,
                    "published_schemes": scheme_n,
                    "catalog_schemes": catalog_n,
                    "national_schemes": national_schemes,
                    "jobs": jobs_by_state.get(state.id, 0),
                    "internships": internships_by_state.get(state.id, 0),
                    "scholarships": scholarships_by_state.get(state.id, 0),
                    "consented_profiles": consented_n,
                    "alerts": alert_counts.get(district.id, 0),
                    "dossier_queued": dossier_counts.get((district.id, "queued"), 0),
                    "dossier_ready": dossier_counts.get((district.id, "ready"), 0),
                    "application_dropoff_pct": None,
                    "disbursement_velocity_pct": None,
                    "cohort_gap_pct": gap_pct,
                    "bottleneck": _NO_PIPELINE,
                }
            )

        return {
            "metric": chosen,
            "metric_available": bool(selected_meta["available"]),
            "metric_reason": selected_meta["reason"],
            "metrics": metric_meta,
            "states": [
                {
                    "id": str(state.id),
                    "name": state.name,
                    "name_hi": state.name_hi,
                    "iso_code": state.iso_code,
                    "kind": state.kind,
                    "lgd_code": state.lgd_code,
                }
                for state in states
            ],
            "districts": districts_out,
            "national_schemes": national_schemes,
            "application_rows": False,
            "geometry": "Join client GeoJSON by district name and state name. PostGIS is not used.",
        }

    def district_detail(self, district_id: str) -> dict:
        parsed = _required_uuid(district_id, "district_id")
        pair = self.analytics.get_district(parsed)
        if pair is None:
            raise NotFoundError(f"District not found: {district_id}")
        district, state = pair
        listing = self.districts(state_id=str(state.id), metric="coverage_saturation")
        card = next((item for item in listing["districts"] if item["id"] == str(district.id)), None)
        if card is None:
            raise NotFoundError(f"District not found: {district_id}")

        profiles = self.analytics.consented_profiles(district_id=district.id)
        heatmap = _age_income_heatmap(profiles)
        dossier = {
            "queued": card["dossier_queued"],
            "ready": card["dossier_ready"],
            "failed": self.analytics.dossier_counts_by_district().get((district.id, "failed"), 0),
        }

        return {
            **card,
            "target_population": None,
            "enrolled": None,
            "population_note": _NO_REGISTRY,
            "application_funnel": [{"stage": stage, "count": None} for stage in FUNNEL_STAGES],
            "application_funnel_note": _NO_PIPELINE,
            "dossier_stages": [
                {"stage": "queued", "count": dossier["queued"]},
                {"stage": "ready", "count": dossier["ready"]},
                {"stage": "failed", "count": dossier["failed"]},
            ],
            "dossier_note": (
                "Action-dossier statuses for consented profiles in this district — not national DBT."
            ),
            "heatmap": heatmap,
        }

    def dispatch_csc_camp(self, user: User, district_id: str) -> dict:
        roles = [role.code for role in user.roles]
        if not has_any_role(roles, ("WELFARE_OFFICER", "ADMIN")):
            raise ForbiddenError("Only a welfare officer or admin can dispatch a CSC camp")
        if "CSC_CAMP_DISPATCH" not in ALERT_TYPES:
            raise ValidationError("CSC camp alert type is not configured")

        parsed = _required_uuid(district_id, "district_id")
        pair = self.analytics.get_district(parsed)
        if pair is None:
            raise NotFoundError(f"District not found: {district_id}")
        district, state = pair

        operators = self.users.list_active_with_role("CSC_OPERATOR")
        created = 0
        skipped = 0
        for operator in operators:
            if _has_open_camp(self.alerts, operator.id, str(district.id)):
                skipped += 1
                continue
            self.alerts.add(
                Alert(
                    user_id=operator.id,
                    scheme_id=None,
                    alert_type="CSC_CAMP_DISPATCH",
                    payload={
                        "kind": "csc_camp",
                        "district_id": str(district.id),
                        "district_name": district.name,
                        "state_name": state.name,
                        "notice": (
                            "Welfare officer requested a targeted CSC camp. "
                            "This is an in-app desk notification, not an SMS."
                        ),
                    },
                )
            )
            created += 1
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise BusinessRuleError(
                "CSC camp alerts need Alembic revision c4a91f2e8b17 (CSC_CAMP_DISPATCH)."
            ) from exc
        return {
            "district_id": str(district.id),
            "district_name": district.name,
            "state_name": state.name,
            "created": created,
            "skipped": skipped,
            "operator_count": len(operators),
            "sms_gateway": False,
            "note": (
                "No CSC_OPERATOR accounts to notify."
                if not operators
                else "In-app alerts written for CSC operators. No SMS gateway."
            ),
        }


def _optional_uuid(value: str | None, field: str) -> UUID | None:
    if value is None or not str(value).strip():
        return None
    return _required_uuid(value, field)


def _required_uuid(value: str, field: str) -> UUID:
    try:
        return UUID(str(value))
    except ValueError as exc:
        raise ValidationError(f"{field} must be a UUID") from exc


def _saturation_for_metric(
    metric: str,
    *,
    coverage_pct: float | None,
    gap_pct: float | None,
    coverage_available: bool,
    cohort_available: bool,
) -> float | None:
    if metric == "coverage_saturation" and coverage_available:
        return coverage_pct
    if metric == "cohort_gap" and cohort_available:
        return gap_pct
    return None


def _cohort_gap(profiles: list[UserProfile]) -> float | None:
    genders = [row.gender for row in profiles if row.gender in {"female", "male"}]
    categories = [row.category for row in profiles if row.category]
    gaps: list[float] = []
    if len(genders) >= MIN_COHORT_ROWS:
        female = genders.count("female")
        male = genders.count("male")
        total = female + male
        if total:
            gaps.append(abs(female - male) / total * 100)
    if len(categories) >= MIN_COHORT_ROWS:
        counts = Counter(categories)
        if len(counts) >= 2:
            values = list(counts.values())
            gaps.append((max(values) - min(values)) / sum(values) * 100)
    if not gaps:
        return None
    return round(max(gaps), 1)


def _age_income_heatmap(profiles: list[UserProfile]) -> dict:
    cells = [[0 for _ in INCOME_BINS] for _ in AGE_BINS]
    plotted = 0
    for row in profiles:
        if row.age is None or row.income is None:
            continue
        age_idx = _bin_index(row.age, AGE_BINS)
        income_idx = _bin_index(row.income, INCOME_BINS)
        if age_idx is None or income_idx is None:
            continue
        cells[age_idx][income_idx] += 1
        plotted += 1
    return {
        "age_bins": list(AGE_LABELS),
        "income_bins": list(INCOME_LABELS),
        "cells": cells,
        "sample_size": plotted,
        "consented_profiles": len(profiles),
        "sparse": plotted < MIN_COHORT_ROWS,
        "note": (
            "Consented profiles only. No names or contact details."
            if plotted
            else "No consented age-income rows for this district."
        ),
    }


def _bin_index(value: int, bins: tuple[tuple[int, int | None], ...]) -> int | None:
    for index, (low, high) in enumerate(bins):
        if high is None:
            if value >= low:
                return index
        elif low <= value <= high:
            return index
    return None


def _has_open_camp(alerts: AlertRepository, user_id: UUID, district_id: str) -> bool:
    for row in alerts.list_unread_of_type(user_id, "CSC_CAMP_DISPATCH"):
        payload = row.payload or {}
        if payload.get("district_id") == district_id:
            return True
    return False
