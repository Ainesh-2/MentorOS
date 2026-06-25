from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    prn = Column(String, unique=True, index=True, nullable=False)
    department = Column(String, nullable=False)
    semester = Column(Integer, nullable=False)
    student_mobile = Column(String, nullable=True)
    parent_mobile = Column(String, nullable=True)
    parent_email = Column(String, nullable=True)
    
    # Analytics / Academic signals
    attendance_rate = Column(Float, default=100.0)
    cgpa = Column(Float, default=0.0)
    success_score = Column(Float, default=100.0)
    risk_status = Column(String, default="Green") # Green, Amber, Coral
    
    # Consent flag
    consent_given = Column(Boolean, default=True)

    # Relationships
    user = relationship("User", back_populates="student_profile")
    mentor_id = Column(Integer, ForeignKey("mentors.id"), nullable=True)
    mentor = relationship("Mentor", back_populates="students")
