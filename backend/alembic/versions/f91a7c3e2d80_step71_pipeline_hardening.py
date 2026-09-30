"""Step 7.1: source health rollup columns, ingestion failure taxonomy, scheme governance JSON."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "f91a7c3e2d80"
down_revision = "d7e4c91a2b08"
branch_labels = None
depends_on = None

_HEALTH = ("HEALTHY", "DEGRADED", "FAILING", "INACTIVE", "UNKNOWN")


def upgrade() -> None:
    op.add_column("sources", sa.Column("last_success_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("sources", sa.Column("last_failure_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "sources",
        sa.Column("consecutive_failures", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "sources",
        sa.Column("total_successes", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "sources",
        sa.Column("total_failures", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("sources", sa.Column("last_http_status", sa.Integer(), nullable=True))
    op.add_column("sources", sa.Column("last_error_code", sa.String(length=64), nullable=True))
    op.add_column("sources", sa.Column("last_content_hash", sa.String(length=64), nullable=True))
    op.add_column("sources", sa.Column("last_fetch_duration_ms", sa.Integer(), nullable=True))
    op.add_column(
        "sources",
        sa.Column("health_status", sa.String(length=16), nullable=False, server_default="UNKNOWN"),
    )
    op.create_check_constraint(
        "sources_health_status",
        "sources",
        f"health_status IN {_HEALTH}",
    )

    op.add_column("ingestion_logs", sa.Column("failure_class", sa.String(length=32), nullable=True))
    op.add_column("ingestion_logs", sa.Column("retryable", sa.Boolean(), nullable=True))
    op.add_column("ingestion_logs", sa.Column("failure_stage", sa.String(length=32), nullable=True))
    op.add_column("ingestion_logs", sa.Column("duration_ms", sa.Integer(), nullable=True))

    op.add_column(
        "scheme_versions",
        sa.Column("governance", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("scheme_versions", "governance")
    op.drop_column("ingestion_logs", "duration_ms")
    op.drop_column("ingestion_logs", "failure_stage")
    op.drop_column("ingestion_logs", "retryable")
    op.drop_column("ingestion_logs", "failure_class")
    op.drop_constraint("sources_health_status", "sources", type_="check")
    op.drop_column("sources", "health_status")
    op.drop_column("sources", "last_fetch_duration_ms")
    op.drop_column("sources", "last_content_hash")
    op.drop_column("sources", "last_error_code")
    op.drop_column("sources", "last_http_status")
    op.drop_column("sources", "total_failures")
    op.drop_column("sources", "total_successes")
    op.drop_column("sources", "consecutive_failures")
    op.drop_column("sources", "last_failure_at")
    op.drop_column("sources", "last_success_at")
