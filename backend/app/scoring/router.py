from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.auth.router import get_current_user
from backend.app.models.user import User
from backend.app.models.student import Student
from backend.app.scoring import schemas

router = APIRouter()


def compute_success_score(attendance: float, academic: float, engagement: float, placement: float) -> float:
    """
    Computes the Success Score:
    score = 0.35 * attendance + 0.35 * academic + 0.15 * engagement + 0.15 * placement
    """
    return round((0.35 * attendance) + (0.35 * academic) + (0.15 * engagement) + (0.15 * placement), 2)


def get_risk_band(score: float) -> str:
    """
    Risk bands:
    - Green: 70 and above
    - Amber: 50 to 69
    - Coral: below 50
    """
    if score >= 70.0:
        return "Green"
    elif score >= 50.0:
        return "Amber"
    else:
        return "Coral"


@router.get("/{student_id}", response_model=schemas.SuccessScoreBreakdown)
def get_student_score(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Fetch success score explanation and breakdown for a student.
    Students can fetch their own, and Mentors/HODs/Admins can query any student.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # RBAC check: Student can only view their own
    if current_user.role == "Student" and student.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own success score breakdown"
        )
    
    # Calculate components
    # Map CGPA to a 100-point scale: CGPA * 10
    academic_score = min(student.cgpa * 10.0, 100.0)
    attendance_score = student.attendance_rate
    
    # Default placeholder values for engagement and placement (Team B can implement real metrics)
    engagement_score = 75.0
    placement_score = 80.0
    
    overall_score = compute_success_score(
        attendance=attendance_score,
        academic=academic_score,
        engagement=engagement_score,
        placement=placement_score
    )
    
    risk_band = get_risk_band(overall_score)
    
    # Update student record with the recalculated score & band,
    student.success_score = overall_score
    student.risk_status = risk_band
    db.commit()
    
    return {
        "student_id": student.id,
        "usn": student.usn,
        "overall_score": overall_score,
        "risk_band": risk_band,
        "components": {
            "attendance_score": attendance_score,
            "academic_score": academic_score,
            "engagement_score": engagement_score,
            "placement_score": placement_score
        }
    }


@router.post("/batch-recalculate", status_code=status.HTTP_200_OK)
def run_batch_recalculation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Run a batch job to recalculate success scores for all students.
    Accessible only by HOD or Admin.
    """
    if current_user.role not in ["HOD", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HOD or Admin can trigger success score batch jobs"
        )
    
    students = db.query(Student).all()
    count = 0
    for student in students:
        academic_score = min(student.cgpa * 10.0, 100.0)
        attendance_score = student.attendance_rate
        overall_score = compute_success_score(
            attendance=attendance_score,
            academic=academic_score,
            engagement=75.0,
            placement=80.0
        )
        risk_band = get_risk_band(overall_score)
        
        student.success_score = overall_score
        student.risk_status = risk_band
        count += 1
        
    db.commit()
    return {"message": f"Successfully ran batch job. Recalculated scores for {count} students."}
