import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from backend.app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ConsentCategory(str, enum.Enum):
    academic = "academic"
    attendance = "attendance"
    placement = "placement"
    wellness = "wellness"


class StudentConsent(Base):
    """
    Per-category DPDP consent. Supersedes the single Student.consent_given
    boolean (which is kept for backward compatibility). One row per
    (student, category); absence of a row means no explicit per-category
    decision has been recorded yet.
    """

    __tablename__ = "student_consents"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    category = Column(Enum(ConsentCategory), nullable=False)
    consented = Column(Boolean, default=False, nullable=False)
    notice_version = Column(String, default="1.0", nullable=False)
    consented_at = Column(DateTime, default=_utcnow, nullable=False)

    student = relationship("Student", back_populates="consents")

    __table_args__ = (
        UniqueConstraint("student_id", "category", name="uq_student_consent_category"),
    )
