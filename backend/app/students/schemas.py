from typing import Optional
from typing_extensions import Literal
from pydantic import BaseModel


class StudentBase(BaseModel):
    usn: str
    department: str
    semester: int
    attendance_rate: Optional[float] = 100.0
    cgpa: Optional[float] = 0.0
    success_score: Optional[float] = 100.0
    risk_status: Optional[str] = "Green"
    consent_given: Optional[bool] = True


class StudentCreate(StudentBase):
    user_id: int


class StudentUpdate(BaseModel):
    department: Optional[str] = None
    semester: Optional[int] = None
    attendance_rate: Optional[float] = None
    cgpa: Optional[float] = None
    success_score: Optional[float] = None
    risk_status: Optional[str] = None


class StudentConsentUpdate(BaseModel):
    consent_given: bool


class ConsentUpdate(BaseModel):
    """Per-category consent toggle. `wellness` is rejected server-side (locked)."""

    category: Literal["academic", "attendance", "placement", "wellness"]
    consented: bool


class StudentResponse(StudentBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True
