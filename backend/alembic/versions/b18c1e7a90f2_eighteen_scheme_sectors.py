"""Allow the 18 CivicMarquee sector ids on schemes.category.

Revision ID: b18c1e7a90f2
Revises: c4a91f2e8b17
Create Date: 2026-09-15
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "b18c1e7a90f2"
down_revision: str | None = "c4a91f2e8b17"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_NEW = (
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
_OLD = ("agriculture", "women", "education", "health", "msme", "other")


def upgrade() -> None:
    op.execute("ALTER TABLE schemes DROP CONSTRAINT ck_schemes_category")
    op.execute(
        "ALTER TABLE schemes ADD CONSTRAINT ck_schemes_category CHECK ("
        "category IN (" + ", ".join(f"'{item}'" for item in _NEW) + "))"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE schemes SET category = 'other' WHERE category NOT IN ("
        + ", ".join(f"'{item}'" for item in _OLD)
        + ")"
    )
    op.execute("ALTER TABLE schemes DROP CONSTRAINT ck_schemes_category")
    op.execute(
        "ALTER TABLE schemes ADD CONSTRAINT ck_schemes_category CHECK ("
        "category IN (" + ", ".join(f"'{item}'" for item in _OLD) + "))"
    )
