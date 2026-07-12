# Package initialization for models
from backend.app.core.database import Base
from backend.app.models.user import User, UserRole
from backend.app.models.student import Student
from backend.app.models.mentor import Mentor
from backend.app.models.meeting import Meeting, MeetingLog
from backend.app.models.consent import StudentConsent, ConsentCategory
from backend.app.models.audit import AuditLog
from backend.app.models.academic import (
    Subject,
    AttendanceRecord,
    LmsActivityRecord,
    PlacementProfile,
    StudentSuccessScore,
)
from backend.app.allocation.models import Allocation

# Re-exported for convenience and to register every model on Base.metadata
# (Alembic autogenerate + tests' create_all depend on these imports).
__all__ = [
    "Base",
    "User",
    "UserRole",
    "Student",
    "Mentor",
    "Meeting",
    "MeetingLog",
    "StudentConsent",
    "ConsentCategory",
    "AuditLog",
    "Subject",
    "AttendanceRecord",
    "LmsActivityRecord",
    "PlacementProfile",
    "StudentSuccessScore",
    "Allocation",
]
