"""Evaluate gazette AST rules against a declared or stored profile."""

from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ValidationError
from app.models.identity import User
from app.models.schemes import Scheme, SchemeVersion
from app.repositories.profiles import ProfileRepository
from app.repositories.schemes import SchemeRepository
from app.schemas.citizen import DeclaredProfile
from app.services.eligibility.conflicts import detect_rule_conflicts
from app.services.eligibility.engine import (
    EligibilityProfile,
    EvaluatedRule,
    evaluate_scheme_rules,
    refold_evaluation,
)
from app.services.eligibility.what_if import unlock_hints
from app.services.ingestion.serialize import to_catalog_record

ASSESSMENT_DISCLAIMER = (
    "This is an eligibility assessment from gazette rules, not an official government decision."
)


class EligibilityService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.schemes = SchemeRepository(session)
        self.profiles = ProfileRepository(session)

    def evaluate(
        self,
        *,
        scheme_ids: list[str] | None,
        declared: DeclaredProfile | None,
        user: User | None,
        as_of: date | None = None,
    ) -> dict:
        profile = self.resolve_profile(declared=declared, user=user)
        rows = self._load_rows(scheme_ids, as_of=as_of)
        evaluations = [
            self._pack(scheme, version, department, profile, as_of=as_of) for scheme, version, department in rows
        ]
        return {"evaluations": evaluations, "profile_source": _profile_source(declared, user)}

    def compare(
        self,
        *,
        scheme_ids: list[str],
        declared: DeclaredProfile | None,
        user: User | None,
        as_of: date | None = None,
    ) -> dict:
        unique_ids = list(dict.fromkeys(scheme_ids))
        if len(unique_ids) < 2:
            raise ValidationError("Compare requires at least two schemes")
        profile = self.resolve_profile(declared=declared, user=user)
        rows = self._load_rows(unique_ids, require_all=True, as_of=as_of)
        items = []
        for scheme, version, department in rows:
            packed = self._pack(scheme, version, department, profile, as_of=as_of)
            packed["documents"] = [
                {"id": item.code, "label": item.label, "mandatory": item.is_mandatory}
                for item in version.documents
            ]
            items.append(packed)
        return {"items": items, "profile_source": _profile_source(declared, user)}

    def what_if(
        self,
        *,
        scheme_ids: list[str] | None,
        declared: DeclaredProfile | None,
        user: User | None,
        as_of: date | None = None,
    ) -> dict:
        payload = self.evaluate(scheme_ids=scheme_ids, declared=declared, user=user, as_of=as_of)
        for item in payload["evaluations"]:
            item["hints"] = unlock_hints(item["evaluation"])
        payload["disclaimer"] = ASSESSMENT_DISCLAIMER
        return payload

    def resolve_profile(self, *, declared: DeclaredProfile | None, user: User | None) -> EligibilityProfile:
        if declared is not None:
            return EligibilityProfile(
                age=declared.age,
                income=declared.income,
                land_hectares=declared.land_hectares,
                gender=declared.gender,
                category=declared.category,
                occupation=declared.occupation,
                state_id=str(declared.state_id) if declared.state_id else None,
            )
        if user is not None:
            stored = user.profile or self.profiles.get_by_user(user.id)
            if stored is not None:
                return EligibilityProfile(
                    age=stored.age,
                    income=stored.income,
                    land_hectares=stored.land_hectares,
                    gender=stored.gender,
                    category=stored.category,
                    occupation=stored.occupation,
                    state_id=str(stored.state_id) if stored.state_id else None,
                )
        raise ValidationError("A self-declared profile is required")

    def _load_rows(
        self,
        scheme_ids: list[str] | None,
        *,
        require_all: bool = False,
        as_of: date | None = None,
    ):
        if not scheme_ids:
            return self.schemes.list_current(statuses=("published",))
        loaded = []
        missing: list[str] = []
        for value in scheme_ids:
            row = self.schemes.get_by_id_or_slug(value)
            if row is None:
                missing.append(value)
                continue
            catalog = (
                self.schemes.catalog_row_as_of(row, as_of)
                if as_of is not None
                else self.schemes.catalog_row(row)
            )
            if catalog is None:
                missing.append(value)
                continue
            loaded.append(catalog)
        if missing and require_all:
            raise NotFoundError(f"Scheme not found: {missing[0]}")
        if missing and not loaded:
            raise NotFoundError(f"Scheme not found: {missing[0]}")
        return loaded

    def _pack(
        self,
        scheme: Scheme,
        version: SchemeVersion,
        department: Any,
        profile: EligibilityProfile,
        *,
        as_of: date | None,
    ) -> dict:
        rules = sorted(version.rules, key=lambda item: (item.sort_order, item.rule_key))
        result = evaluate_scheme_rules(scheme.slug, rules, profile)
        geo = _geography_rule(scheme, profile)
        if geo is not None:
            result = refold_evaluation(scheme.slug, [*result.rules, geo])
        evaluation = result.as_api()
        evaluation.update(
            {
                "asOf": None if as_of is None else as_of.isoformat(),
                "versionNumber": version.version_number,
                "sourceUrl": version.source_url,
                "effectiveFrom": None if version.effective_from is None else version.effective_from.isoformat(),
                "effectiveTo": None if version.effective_to is None else version.effective_to.isoformat(),
                "disclaimer": ASSESSMENT_DISCLAIMER,
                "conflicts": detect_rule_conflicts(rules),
            }
        )
        return {
            "scheme": to_catalog_record(scheme, version, department),
            "evaluation": evaluation,
        }


def _geography_rule(scheme: Scheme, profile: EligibilityProfile) -> EvaluatedRule | None:
    if scheme.state_id is None:
        return None
    expected = str(scheme.state_id)
    if not profile.state_id:
        return EvaluatedRule(
            id="geography",
            label="State of residence",
            detail="Scheme is notified for a specific state.",
            verdict="unknown",
            explanation="State is not declared.",
        )
    passed = profile.state_id == expected
    return EvaluatedRule(
        id="geography",
        label="State of residence",
        detail="Scheme is notified for a specific state.",
        verdict="pass" if passed else "fail",
        explanation="Resident state matches the gazette." if passed else "Resident state does not match this scheme.",
    )


def _profile_source(declared: DeclaredProfile | None, user: User | None) -> str:
    if declared is not None:
        return "declared"
    if user is not None:
        return "stored"
    return "none"
