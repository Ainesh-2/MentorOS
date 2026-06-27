from pydantic import BaseModel
from typing import Optional, List


class ScoreComponents(BaseModel):
    attendance_score: float  # out of 100
    academic_score: float    # out of 100 (derived from CGPA usually)
    engagement_score: float  # out of 100
    placement_score: float   # out of 100


class SuccessScoreBreakdown(BaseModel):
    student_id: int
    usn: str
    
    # development fields
    period: Optional[str] = None
    attendance_component: Optional[float] = None
    academic_component: Optional[float] = None
    engagement_component: Optional[float] = None
    placement_component: Optional[float] = None
    total_score: Optional[float] = None
    risk_category: Optional[str] = None
    
    # our fields
    full_name: Optional[str] = None
    overall_score: Optional[float] = None
    risk_band: Optional[str] = None  # Green, Amber, Coral
    components: Optional[ScoreComponents] = None

    class Config:
        from_attributes = True


class ScoreUpdateRequest(BaseModel):
    """Update individual metric values for a student."""
    attendance_score: Optional[float] = None
    academic_score: Optional[float] = None
    engagement_score: Optional[float] = None
    placement_score: Optional[float] = None


class RiskBandSummary(BaseModel):
    """Aggregate risk band counts across all students."""
    green: int
    amber: int
    coral: int
    total: int


class DepartmentRiskSummary(BaseModel):
    """Risk breakdown per department."""
    department: str
    green: int
    amber: int
    coral: int
    total: int


class BatchComputeResponse(BaseModel):
    """Response after batch score computation."""
    updated_count: int
    risk_summary: RiskBandSummary
