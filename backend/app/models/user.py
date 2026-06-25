from sqlalchemy import Boolean, Column, Integer, String
from sqlalchemy.orm import relationship
from backend.app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    STUDENT = "Student"
    MENTOR = "Mentor"
    HOD = "HOD"
    ADMIN = "Admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    # Store string representation, or Enum
    role = Column(Enum(UserRole), default=UserRole.STUDENT, nullable=False)
    is_active = Column(Boolean(), default=True)

    # Relationships:
    student_profile = relationship(
        "Student", back_populates="user", uselist=False)
    mentor_profile = relationship(
        "Mentor", back_populates="user", uselist=False)
