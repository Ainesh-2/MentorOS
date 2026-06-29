from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field


class MeetingLogCreate(BaseModel):
    topics_discussed: List[str] = Field(default_factory=list)
    action_items: List[str] = Field(default_factory=list)
    next_meeting_date: Optional[date] = None
    observations: Optional[str] = None


# ============================================
# MEETING SCHEMAS
# ============================================

class MeetingBase(BaseModel):
    title: str
    date: datetime
    mode: Optional[str] = "in-person"  # in-person, video
    notes: Optional[str] = None
    status: Optional[str] = "Scheduled"


class MeetingCreate(MeetingBase):
    student_id: int


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[datetime] = None
    mode: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class MeetingResponse(MeetingBase):
    id: int
    mentor_id: int
    student_id: int
    student_name: Optional[str] = None
    mentor_name: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================
# MENTOR SCHEMAS
# ============================================

class MentorBase(BaseModel):
    department: str
    max_mentees: Optional[int] = 20


class MentorResponse(MentorBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


class MentorRosterItem(BaseModel):
    """A student in the mentor's roster with score and meeting context."""
    student_id: int
    usn: str
    full_name: str
    email: str
    department: str
    semester: int
    attendance_rate: float
    cgpa: float
    success_score: float
    risk_status: str
    consent_given: bool
    last_meeting: Optional[MeetingResponse] = None
    next_meeting: Optional[MeetingResponse] = None
    open_action_items: int = 0

    class Config:
        from_attributes = True


# ============================================
# ALLOCATION SCHEMAS
# ============================================

class AllocationRequest(BaseModel):
    student_id: int
    mentor_id: int


class AllocationResponse(BaseModel):
    student_id: int
    mentor_id: int
    student_name: str
    mentor_name: str
    department: str
    message: str


# ============================================
# DASHBOARD SCHEMAS
# ============================================

class MentorDashboardStats(BaseModel):
    """Aggregated stats for the mentor's dashboard."""
    total_mentees: int
    at_risk_count: int       # Coral
    needs_attention_count: int  # Amber
    on_track_count: int      # Green
    upcoming_meetings: int
    completed_meetings: int
    avg_success_score: float
