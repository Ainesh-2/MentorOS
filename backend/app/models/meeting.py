from datetime import datetime, timezone

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    mentor_id = Column(Integer, ForeignKey("mentors.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)

    title = Column(String, nullable=False)
    date = Column(DateTime, nullable=False)
    mode = Column(String, default="in-person")  # in-person, video, phone
    notes = Column(Text, nullable=True)
    status = Column(String, default="Scheduled") # Scheduled, Completed, Cancelled

    # Relationships
    mentor = relationship("Mentor", back_populates="meetings")
    student = relationship("Student", foreign_keys=[student_id])
    # Structured post-meeting log (one-to-one). Coexists with the free-text `notes`.
    log = relationship(
        "MeetingLog",
        back_populates="meeting",
        uselist=False,
        cascade="all, delete-orphan",
    )


class MeetingLog(Base):
    """
    Structured record of a completed meeting. Replaces relying on the
    free-text `Meeting.notes` blob for reporting and action tracking.
    """

    __tablename__ = "meeting_logs"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), unique=True, nullable=False)
    topics_discussed = Column(JSON, default=list, nullable=False)
    action_items = Column(JSON, default=list, nullable=False)
    next_meeting_date = Column(Date, nullable=True)
    observations = Column(Text, nullable=True)
    logged_at = Column(DateTime, default=_utcnow, nullable=False)
    logged_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    meeting = relationship("Meeting", back_populates="log")
