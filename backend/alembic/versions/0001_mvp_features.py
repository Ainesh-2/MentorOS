"""MVP feature pass: meeting logs, per-category consent, audit log, is_under_18

Adds the new objects introduced by the security/feature pass without touching
existing tables (users/students/mentors/meetings are assumed to already exist
in the target database). Hand-authored because Postgres was unavailable for
autogenerate at the time of writing.

Revision ID: 0001_mvp_features
Revises:
Create Date: 2026-06-24
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0001_mvp_features"
down_revision = None
branch_labels = None
depends_on = None


consent_category = sa.Enum(
    "academic", "attendance", "placement", "wellness", name="consentcategory"
)


def upgrade() -> None:
    # New column on students (DPDP under-18 gating). Server default backfills
    # existing rows; the model default handles new inserts.
    op.add_column(
        "students",
        sa.Column(
            "is_under_18",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    op.create_table(
        "meeting_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("meeting_id", sa.Integer(), sa.ForeignKey("meetings.id"), nullable=False, unique=True),
        sa.Column("topics_discussed", sa.JSON(), nullable=False),
        sa.Column("action_items", sa.JSON(), nullable=False),
        sa.Column("next_meeting_date", sa.Date(), nullable=True),
        sa.Column("observations", sa.Text(), nullable=True),
        sa.Column("logged_at", sa.DateTime(), nullable=False),
        sa.Column("logged_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
    )
    op.create_index("ix_meeting_logs_id", "meeting_logs", ["id"])

    op.create_table(
        "student_consents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("category", consent_category, nullable=False),
        sa.Column("consented", sa.Boolean(), nullable=False),
        sa.Column("notice_version", sa.String(), nullable=False),
        sa.Column("consented_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("student_id", "category", name="uq_student_consent_category"),
    )
    op.create_index("ix_student_consents_id", "student_consents", ["id"])
    op.create_index("ix_student_consents_student_id", "student_consents", ["student_id"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("entity_type", sa.String(), nullable=True),
        sa.Column("entity_id", sa.String(), nullable=True),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_audit_logs_id", "audit_logs", ["id"])
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])

    # Drop the temporary server default now that existing rows are backfilled.
    op.alter_column("students", "is_under_18", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_audit_logs_user_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_id", table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index("ix_student_consents_student_id", table_name="student_consents")
    op.drop_index("ix_student_consents_id", table_name="student_consents")
    op.drop_table("student_consents")

    op.drop_index("ix_meeting_logs_id", table_name="meeting_logs")
    op.drop_table("meeting_logs")

    op.drop_column("students", "is_under_18")

    consent_category.drop(op.get_bind(), checkfirst=True)
