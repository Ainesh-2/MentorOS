from typing import Optional
from pydantic import BaseModel


class SuccessScoreBreakdown(BaseModel):
    """
    Matches the frontend `ScoreBreakdown` contract (src/types/index.ts):
    flat `*_component` fields, `total_score`, and `risk_category`.

    Components and `total_score` are nullable — `None` means no source data.
    `risk_category` is lowercase and includes `insufficient_data` (returned
    when attendance or academic has no data, so no score can be formed).
    """

    student_id: int
    usn: str
    period: str
    attendance_component: Optional[float] = None
    academic_component: Optional[float] = None
    engagement_component: Optional[float] = None
    placement_component: Optional[float] = None
    total_score: Optional[float] = None
    risk_category: str  # green | amber | coral | insufficient_data
