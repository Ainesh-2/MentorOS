from pydantic import BaseModel


class ScoreComponents(BaseModel):
    attendance_score: float  # out of 100
    academic_score: float    # out of 100 (derived from CGPA usually)
    engagement_score: float  # out of 100
    placement_score: float   # out of 100


class SuccessScoreBreakdown(BaseModel):
    student_id: int
    usn: str
    overall_score: float
    risk_band: str  # Green, Amber, Coral
    components: ScoreComponents

    class Config:
        from_attributes = True
