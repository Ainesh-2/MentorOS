from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    mentor_id = Column(Integer, ForeignKey("mentors.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    
    title = Column(String, nullable=False)
    date = Column(DateTime, nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(String, default="Scheduled") # Scheduled, Completed, Cancelled

    # Relationships
    mentor = relationship("Mentor", back_populates="meetings")
    student = relationship("Student", foreign_keys=[student_id])
