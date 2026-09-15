"""Evaluate gazette AST rules against a declared or stored profile."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ValidationError
from app.models.identity import User
from app.repositories.profiles import ProfileRepository
from app.repositories.schemes import SchemeRepository
from app.schemas.citizen import DeclaredProfile
from app.services.eligibility.engine import EligibilityProfile, evaluate_scheme_rules
from app.services.ingestion.serialize import to_catalog_record


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
    ) -> dict:
        profile = self.resolve_profile(declared=declared, user=user)
        rows = self._load_rows(scheme_ids)
        evaluations = []
        for scheme, version, department in rows:
            rules = sorted(version.rules, key=lambda item: (item.sort_order, item.rule_key))
            result = evaluate_scheme_rules(scheme.slug, rules, profile)
            evaluations.append(
                {
                    "scheme": to_catalog_record(scheme, version, department),
                    "evaluation": result.as_api(),
                }
            )
        return {"evaluations": evaluations, "profile_source": _profile_source(declared, user)}

    def compare(
        self,
        *,
        scheme_ids: list[str],
        declared: DeclaredProfile | None,
        user: User | None,
    ) -> dict:
        unique_ids = list(dict.fromkeys(scheme_ids))
        if len(unique_ids) < 2:
            raise ValidationError("Compare requires at least two schemes")
        profile = self.resolve_profile(declared=declared, user=user)
        rows = self._load_rows(unique_ids, require_all=True)
        items = []
        for scheme, version, department in rows:
            rules = sorted(version.rules, key=lambda item: (item.sort_order, item.rule_key))
            result = evaluate_scheme_rules(scheme.slug, rules, profile)
            items.append(
                {
                    "scheme": to_catalog_record(scheme, version, department),
                    "evaluation": result.as_api(),
                    "documents": [
                        {"id": item.code, "label": item.label, "mandatory": item.is_mandatory}
                        for item in version.documents
                    ],
                }
            )
        return {"items": items, "profile_source": _profile_source(declared, user)}

    def resolve_profile(self, *, declared: DeclaredProfile | None, user: User | None) -> EligibilityProfile:
        if declared is not None:
            return EligibilityProfile(
                age=declared.age,
                income=declared.income,
                land_hectares=declared.land_hectares,
                gender=declared.gender,
                category=declared.category,
                occupation=declared.occupation,
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
                )
        raise ValidationError("A self-declared profile is required")

    def _load_rows(self, scheme_ids: list[str] | None, *, require_all: bool = False):
        if not scheme_ids:
            return self.schemes.list_current(statuses=("published",))
        loaded = []
        missing: list[str] = []
        for value in scheme_ids:
            row = self.schemes.get_by_id_or_slug(value)
            catalog = self.schemes.catalog_row(row) if row is not None else None
            if catalog is None:
                missing.append(value)
                continue
            loaded.append(catalog)
        if missing and require_all:
            raise NotFoundError(f"Scheme not found: {missing[0]}")
        if missing and not loaded:
            raise NotFoundError(f"Scheme not found: {missing[0]}")
        return loaded


def _profile_source(declared: DeclaredProfile | None, user: User | None) -> str:
    if declared is not None:
        return "declared"
    if user is not None:
        return "stored"
    return "none"
