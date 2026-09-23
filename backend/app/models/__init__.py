"""SQLAlchemy ORM models for the production schema.

Importing this package registers every table on Base.metadata for Alembic.
"""

from app.models.actions import ActionDossier, Alert, AuditLog
from app.models.applications import Application
from app.models.embeddings import DocumentEmbedding
from app.models.geography import District, State
from app.models.identity import Role, User, UserProfile, UserRole
from app.models.ingestion import Department, IngestionLog, Source, SourceDocument
from app.models.opportunities import Internship, Job, Scholarship
from app.models.policy import Policy, PolicyChange, PolicyClause, PolicyVersion
from app.models.schemes import Benefit, EligibilityRule, RequiredDocument, Scheme, SchemeVersion

PRODUCTION_TABLES = (
    "users",
    "roles",
    "user_roles",
    "states",
    "districts",
    "user_profiles",
    "departments",
    "sources",
    "source_documents",
    "ingestion_logs",
    "schemes",
    "scheme_versions",
    "eligibility_rules",
    "benefits",
    "required_documents",
    "jobs",
    "internships",
    "scholarships",
    "policies",
    "policy_versions",
    "policy_clauses",
    "policy_changes",
    "alerts",
    "action_dossiers",
    "audit_logs",
    "applications",
)

__all__ = [
    "PRODUCTION_TABLES",
    "ActionDossier",
    "Application",
    "Alert",
    "AuditLog",
    "Benefit",
    "Department",
    "District",
    "DocumentEmbedding",
    "EligibilityRule",
    "IngestionLog",
    "Internship",
    "Job",
    "Policy",
    "PolicyChange",
    "PolicyClause",
    "PolicyVersion",
    "RequiredDocument",
    "Role",
    "Scheme",
    "SchemeVersion",
    "Scholarship",
    "Source",
    "SourceDocument",
    "State",
    "User",
    "UserProfile",
    "UserRole",
]
