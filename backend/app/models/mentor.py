from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class Mentor(Base):
    __tablename__ = "mentors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    department = Column(String, nullable=False)
    max_mentees = Column(Integer, default=20)

    # Relationships
    user = relationship("User", back_populates="mentor_profile")
    students = relationship("Student", back_populates="mentor")
    meetings = relationship("Meeting", back_populates="mentor")
