from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class ComplianceReport(BaseModel):
    department: str
    academic_year: str
    generated_at: datetime
    total_students: int
    risk_summary: dict  # counts of Green, Amber, Coral
    mentoring_meetings_logged: int
    accreditation_type: str  # NAAC, NBA


class UserMgmtAction(BaseModel):
    user_id: int
    action: str  # e.g., "activate", "deactivate", "change_role"
    target_role: Optional[str] = None
