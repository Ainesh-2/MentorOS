"""normalize attendance subjects

Revision ID: 1aa377368443
Revises: 002
Create Date: 2026-07-12 22:53:07.313593
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1aa377368443"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create subjects table
    op.create_table(
        "subjects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("subject_code", sa.String(length=50), nullable=False),
        sa.Column("subject_name", sa.String(length=255), nullable=False),
        sa.Column("credits", sa.Integer(), nullable=False),
        sa.Column("department", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_subjects_department"),"subjects",["department"],unique=False,)
    op.create_index(op.f("ix_subjects_id"),"subjects",["id"],unique=False,)
    op.create_index(op.f("ix_subjects_subject_code"),"subjects",["subject_code"],unique=True,)
    # Add normalized subject reference
    op.add_column("attendance_records",sa.Column("subject_id", sa.Integer(), nullable=False),)
    # Replace unique constraint
    op.drop_constraint(op.f("uq_attendance_student_subject_period"),"attendance_records",type_="unique",)
    op.create_unique_constraint("uq_attendance_student_subject_period","attendance_records",["student_id", "subject_id", "period"],)
    # Add FK + index
    op.create_index(op.f("ix_attendance_records_subject_id"),"attendance_records",["subject_id"],unique=False,)
    op.create_foreign_key("fk_attendance_records_subject_id_subjects","attendance_records","subjects",["subject_id"],["id"],)
    # Remove denormalized columns
    op.drop_column("attendance_records", "subject_code")
    op.drop_column("attendance_records", "subject_name")


def downgrade() -> None:
    # Restore denormalized columns
    op.add_column("attendance_records",sa.Column("subject_name",sa.VARCHAR(length=255),autoincrement=False,nullable=True,),)
    op.add_column("attendance_records",sa.Column("subject_code",sa.VARCHAR(length=50),autoincrement=False,nullable=False,),)
    op.drop_constraint("fk_attendance_records_subject_id_subjects","attendance_records",type_="foreignkey",)
    op.drop_index(op.f("ix_attendance_records_subject_id"),table_name="attendance_records",)
    op.drop_constraint("uq_attendance_student_subject_period","attendance_records",type_="unique",)
    op.create_unique_constraint(op.f("uq_attendance_student_subject_period"),"attendance_records",["student_id", "subject_code", "period"],postgresql_nulls_not_distinct=False,)
    op.drop_column("attendance_records", "subject_id")
    op.drop_index(op.f("ix_subjects_subject_code"),table_name="subjects",)
    op.drop_index(op.f("ix_subjects_id"),table_name="subjects",)
    op.drop_index(op.f("ix_subjects_department"),table_name="subjects",)
    op.drop_table("subjects")