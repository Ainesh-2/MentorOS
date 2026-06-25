"""Add meetings.mode (in-person / video)

Revision ID: 0002_add_meeting_mode
Revises: 0001_mvp_features
Create Date: 2026-06-24
"""
from alembic import op
import sqlalchemy as sa


revision = "0002_add_meeting_mode"
down_revision = "0001_mvp_features"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "meetings",
        sa.Column("mode", sa.String(), nullable=True, server_default="in-person"),
    )
    op.alter_column("meetings", "mode", server_default=None)


def downgrade() -> None:
    op.drop_column("meetings", "mode")
