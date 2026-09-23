"""Closed vocabularies stored as VARCHAR + CHECK, not native PG enums."""

from __future__ import annotations

ROLE_CODES = (
    "CITIZEN",
    "STUDENT",
    "CSC_OPERATOR",
    "WELFARE_OFFICER",
    "POLICY_ANALYST",
    "ADMIN",
)

STATE_KINDS = ("STATE", "UT")

CONNECTOR_TYPES = ("html", "dynamic", "pdf", "tabular", "json")

INGESTION_STATUSES = ("running", "ok", "failed")

RECORD_STATUSES = ("draft", "published", "archived", "needs_review")

# Eighteen CivicMarquee sector ids plus `other` for unclassified official pages.
SCHEME_CATEGORIES = (
    "agriculture",
    "welfare",
    "education",
    "msme",
    "women",
    "skills",
    "banking",
    "health",
    "housing",
    "sports",
    "science",
    "transport",
    "tourism",
    "jal",
    "legal",
    "artisans",
    "disaster",
    "gig",
    "other",
)

RULE_KINDS = ("age", "income", "land", "gender", "category", "occupation", "always")

GENDERS = ("any", "female", "male")

CASTE_CATEGORIES = ("GEN", "OBC", "SC", "ST", "EWS")

OCCUPATIONS = ("farmer", "student", "artisan", "shg", "other")

ALERT_TYPES = ("NEW_SCHEME_MATCH", "DEADLINE_APPROACHING", "RULE_MODIFIED", "CSC_CAMP_DISPATCH")

DOSSIER_STATUSES = ("queued", "ready", "failed")

APPLICATION_STAGES = (
    "Discovered",
    "Submitted",
    "Tehsil Verified",
    "Sanctioned",
    "DBT Disbursed",
)

CHANGE_KINDS = ("added", "removed", "amended", "numeric")

AUDIT_ACTIONS = (
    "login",
    "logout",
    "role_change",
    "profile_update",
    "profile_purge",
    "ingestion_run",
    "review_approve",
    "application_submit",
)
