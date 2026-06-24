from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field


class MeetingLogCreate(BaseModel):
    topics_discussed: List[str] = Field(default_factory=list)
    action_items: List[str] = Field(default_factory=list)
    next_meeting_date: Optional[date] = None
    observations: Optional[str] = None


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

    class Config:
        from_attributes = True


# Mentor Schemas,
class MentorBase(BaseModel):
    department: str
    max_mentees: Optional[int] = 20


class MentorResponse(MentorBase):
    id: int
    user_id: int
    
    class Config:
        from_attributes = True


class MentorRosterItem(MentorResponse):
    full_name: str
    email: str
    mentees_count: int


class AllocationRequest(BaseModel):
    student_id: int
    mentor_id: int
