"""Phase 3 scoring: sgpa + attendance/lms/placement/score-history tables

Hand-authored (Postgres unavailable for autogenerate at write time). Additive
only — does not touch existing tables beyond adding students.sgpa.

Revision ID: 0003_phase3_scoring
Revises: 0002_add_meeting_mode
Create Date: 2026-06-24
"""
from alembic import op
import sqlalchemy as sa


revision = "0003_phase3_scoring"
down_revision = "0002_add_meeting_mode"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("students", sa.Column("sgpa", sa.Float(), nullable=True))

    op.create_table(
        "attendance_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("subject_code", sa.String(length=50), nullable=False),
        sa.Column("subject_name", sa.String(length=255), nullable=True),
        sa.Column("total_classes", sa.Integer(), nullable=False),
        sa.Column("attended_classes", sa.Integer(), nullable=False),
        sa.Column("period", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("student_id", "subject_code", "period", name="uq_attendance_student_subject_period"),
    )
    op.create_index("ix_attendance_records_id", "attendance_records", ["id"])
    op.create_index("ix_attendance_records_student_id", "attendance_records", ["student_id"])
    op.create_index("ix_attendance_records_period", "attendance_records", ["period"])

    op.create_table(
        "lms_activity_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("period", sa.String(length=20), nullable=False),
        sa.Column("login_count", sa.Integer(), nullable=True),
        sa.Column("assignments_submitted", sa.Integer(), nullable=True),
        sa.Column("assignments_total", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("student_id", "period", name="uq_lms_student_period"),
    )
    op.create_index("ix_lms_activity_records_id", "lms_activity_records", ["id"])
    op.create_index("ix_lms_activity_records_student_id", "lms_activity_records", ["student_id"])
    op.create_index("ix_lms_activity_records_period", "lms_activity_records", ["period"])

    op.create_table(
        "placement_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False, unique=True),
        sa.Column("has_resume", sa.Boolean(), nullable=True),
        sa.Column("skills_count", sa.Integer(), nullable=True),
        sa.Column("certifications_count", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_placement_profiles_id", "placement_profiles", ["id"])
    op.create_index("ix_placement_profiles_student_id", "placement_profiles", ["student_id"])

    op.create_table(
        "student_success_scores",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("attendance_component", sa.Float(), nullable=True),
        sa.Column("academic_component", sa.Float(), nullable=True),
        sa.Column("engagement_component", sa.Float(), nullable=True),
        sa.Column("placement_component", sa.Float(), nullable=True),
        sa.Column("total_score", sa.Float(), nullable=True),
        sa.Column("risk_category", sa.String(length=20), nullable=False),
        sa.Column("computed_at", sa.DateTime(), nullable=True),
        sa.Column("period", sa.String(length=20), nullable=True),
    )
    op.create_index("ix_student_success_scores_id", "student_success_scores", ["id"])
    op.create_index("ix_student_success_scores_student_id", "student_success_scores", ["student_id"])
    op.create_index("ix_student_success_scores_computed_at", "student_success_scores", ["computed_at"])
    op.create_index("idx_student_computed", "student_success_scores", ["student_id", "computed_at"])


def downgrade() -> None:
    op.drop_table("student_success_scores")
    op.drop_table("placement_profiles")
    op.drop_table("lms_activity_records")
    op.drop_table("attendance_records")
    op.drop_column("students", "sgpa")
