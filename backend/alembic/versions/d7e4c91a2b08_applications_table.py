"""Add applications table and audit action for CSC/citizen submit.

Revision ID: d7e4c91a2b08
Revises: b18c1e7a90f2
Create Date: 2026-09-23
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "d7e4c91a2b08"
down_revision: str | None = "b18c1e7a90f2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_AUDIT_NEW = (
    "action IN ('login', 'logout', 'role_change', 'profile_update', 'profile_purge', "
    "'ingestion_run', 'review_approve', 'application_submit')"
)
_AUDIT_OLD = (
    "action IN ('login', 'logout', 'role_change', 'profile_update', 'profile_purge', "
    "'ingestion_run', 'review_approve')"
)


def upgrade() -> None:
    op.create_table(
        "applications",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("scheme_id", sa.Uuid(), nullable=False),
        sa.Column("district_id", sa.Uuid(), nullable=True),
        sa.Column("stage", sa.String(length=32), nullable=False, server_default="Submitted"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "stage IN ('Discovered', 'Submitted', 'Tehsil Verified', 'Sanctioned', 'DBT Disbursed')",
            name=op.f("ck_applications_stage"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["scheme_id"], ["schemes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["district_id"], ["districts.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_applications_user_id"), "applications", ["user_id"], unique=False)
    op.create_index(op.f("ix_applications_scheme_id"), "applications", ["scheme_id"], unique=False)
    op.create_index(op.f("ix_applications_district_id"), "applications", ["district_id"], unique=False)
    op.execute("ALTER TABLE audit_logs DROP CONSTRAINT ck_audit_logs_action")
    op.execute(f"ALTER TABLE audit_logs ADD CONSTRAINT ck_audit_logs_action CHECK ({_AUDIT_NEW})")


def downgrade() -> None:
    op.execute("ALTER TABLE audit_logs DROP CONSTRAINT ck_audit_logs_action")
    op.execute(f"ALTER TABLE audit_logs ADD CONSTRAINT ck_audit_logs_action CHECK ({_AUDIT_OLD})")
    op.drop_index(op.f("ix_applications_district_id"), table_name="applications")
    op.drop_index(op.f("ix_applications_scheme_id"), table_name="applications")
    op.drop_index(op.f("ix_applications_user_id"), table_name="applications")
    op.drop_table("applications")
