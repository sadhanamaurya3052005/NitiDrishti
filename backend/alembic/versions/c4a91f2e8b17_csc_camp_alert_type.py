"""Allow CSC camp dispatch alerts.

Revision ID: c4a91f2e8b17
Revises: 05782a7e01c8
Create Date: 2026-09-15
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "c4a91f2e8b17"
down_revision: str | None = "05782a7e01c8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_NEW = (
    "alert_type IN ('NEW_SCHEME_MATCH', 'DEADLINE_APPROACHING', "
    "'RULE_MODIFIED', 'CSC_CAMP_DISPATCH')"
)
_OLD = "alert_type IN ('NEW_SCHEME_MATCH', 'DEADLINE_APPROACHING', 'RULE_MODIFIED')"


def upgrade() -> None:
    op.execute("ALTER TABLE alerts DROP CONSTRAINT ck_alerts_alert_type")
    op.execute(f"ALTER TABLE alerts ADD CONSTRAINT ck_alerts_alert_type CHECK ({_NEW})")


def downgrade() -> None:
    op.execute("ALTER TABLE alerts DROP CONSTRAINT ck_alerts_alert_type")
    op.execute(f"ALTER TABLE alerts ADD CONSTRAINT ck_alerts_alert_type CHECK ({_OLD})")
