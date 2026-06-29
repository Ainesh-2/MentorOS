"""add allocation table

Revision ID: 002
Revises: 001_base_version
Create Date: 2026-06-28
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001_base_version"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "allocations",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("mentor_id", sa.Integer(), nullable=False),
        sa.Column("allocated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("allocated_by", sa.Integer(), nullable=True),
        sa.Column(
            "method",
            sa.String(length=20),
            nullable=False,
            server_default="auto",
        ),
        sa.ForeignKeyConstraint(["mentor_id"], ["mentors.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["allocated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id", name="uq_allocation_student"),
    )
    op.create_index("ix_allocations_mentor_id", "allocations", ["mentor_id"])
    op.create_index("ix_allocations_student_id", "allocations", ["student_id"])


def downgrade() -> None:
    op.drop_index("ix_allocations_student_id", table_name="allocations")
    op.drop_index("ix_allocations_mentor_id", table_name="allocations")
    op.drop_table("allocations")
