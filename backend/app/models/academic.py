from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)

from backend.app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AttendanceRecord(Base):
    """Per-subject attendance for a student in a given period (e.g. "2025-ODD")."""

    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    subject_code = Column(String(50), nullable=False)
    subject_name = Column(String(255), nullable=True)
    total_classes = Column(Integer, nullable=False)
    attended_classes = Column(Integer, nullable=False)
    period = Column(String(20), nullable=False, index=True)
    created_at = Column(DateTime, default=_utcnow)

    __table_args__ = (
        UniqueConstraint("student_id", "subject_code", "period", name="uq_attendance_student_subject_period"),
    )


class LmsActivityRecord(Base):
    """LMS engagement signals for a student in a given period."""

    __tablename__ = "lms_activity_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    period = Column(String(20), nullable=False, index=True)
    login_count = Column(Integer, default=0)
    assignments_submitted = Column(Integer, default=0)
    assignments_total = Column(Integer, default=0)
    created_at = Column(DateTime, default=_utcnow)

    __table_args__ = (
        UniqueConstraint("student_id", "period", name="uq_lms_student_period"),
    )


class PlacementProfile(Base):
    """Placement-readiness checklist for a student (one per student)."""

    __tablename__ = "placement_profiles"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), unique=True, nullable=False, index=True)
    has_resume = Column(Boolean, default=False)
    skills_count = Column(Integer, default=0)
    certifications_count = Column(Integer, default=0)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)


class StudentSuccessScore(Base):
    """
    Computed-score history. One row per computation. Component columns are
    nullable (null = no source data). `risk_category` is lowercase
    (green/amber/coral/insufficient_data) to match the frontend taxonomy.
    """

    __tablename__ = "student_success_scores"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)

    attendance_component = Column(Float, nullable=True)
    academic_component = Column(Float, nullable=True)
    engagement_component = Column(Float, nullable=True)
    placement_component = Column(Float, nullable=True)

    total_score = Column(Float, nullable=True)
    risk_category = Column(String(20), nullable=False)

    computed_at = Column(DateTime, default=_utcnow, index=True)
    period = Column(String(20), nullable=True)

    __table_args__ = (
        Index("idx_student_computed", "student_id", "computed_at"),
    )
