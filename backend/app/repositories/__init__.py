"""Data access layer. Only repositories issue database queries."""

from app.repositories.alerts import AlertRepository
from app.repositories.analytics import AnalyticsRepository
from app.repositories.audit import AuditRepository
from app.repositories.base import BaseRepository
from app.repositories.dossiers import DossierRepository
from app.repositories.ingestion import (
    IngestionLogRepository,
    SourceDocumentRepository,
    SourceRepository,
)
from app.repositories.opportunities import (
    InternshipRepository,
    JobRepository,
    ScholarshipRepository,
)
from app.repositories.policies import (
    PolicyChangeRepository,
    PolicyClauseRepository,
    PolicyRepository,
    PolicyVersionRepository,
)
from app.repositories.profiles import ProfileRepository
from app.repositories.roles import RoleRepository
from app.repositories.schemes import SchemeRepository
from app.repositories.users import UserRepository

__all__ = [
    "AlertRepository",
    "AnalyticsRepository",
    "AuditRepository",
    "BaseRepository",
    "DossierRepository",
    "IngestionLogRepository",
    "InternshipRepository",
    "JobRepository",
    "PolicyChangeRepository",
    "PolicyClauseRepository",
    "PolicyRepository",
    "PolicyVersionRepository",
    "ProfileRepository",
    "RoleRepository",
    "SchemeRepository",
    "ScholarshipRepository",
    "SourceDocumentRepository",
    "SourceRepository",
    "UserRepository",
]
