from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.auth.router import get_current_user
from backend.app.models.user import User
from backend.app.models.student import Student
from backend.app.scoring import schemas

router = APIRouter()


# ============================================
# CORE FORMULA — Success Score Engine
# ============================================

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


def _build_breakdown(student: Student) -> schemas.SuccessScoreBreakdown:
    """Helper to build a SuccessScoreBreakdown from a Student ORM object."""
    attendance = student.attendance_rate or 0.0
    academic = min((student.cgpa or 0.0) * 10.0, 100.0)  # CGPA (0-10) -> 0-100
    engagement = getattr(student, "engagement_score", 70.0) or 70.0
    placement = getattr(student, "placement_score", 70.0) or 70.0

    overall = compute_success_score(attendance, academic, engagement, placement)
    band = get_risk_band(overall)

    return schemas.SuccessScoreBreakdown(
        student_id=student.id,
        usn=student.usn,
        full_name=student.user.full_name if student.user else "Unknown",
        overall_score=overall,
        risk_band=band,
        components=schemas.ScoreComponents(
            attendance_score=round(attendance, 2),
            academic_score=round(academic, 2),
            engagement_score=round(engagement, 2),
            placement_score=round(placement, 2),
        ),
    )


# ============================================
# ENDPOINTS
# ============================================

@router.get("/", response_model=List[schemas.SuccessScoreBreakdown])
def get_all_scores(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    List all student scores with breakdown and risk bands.
    Accessible to Mentors, HODs, and Admins.
    """
    if current_user.role not in ("Mentor", "HOD", "Admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )

    students = db.query(Student).all()
    return [_build_breakdown(s) for s in students]


@router.get("/risk-summary", response_model=schemas.RiskBandSummary)
def get_risk_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Aggregate risk band counts across all students.
    Returns { green, amber, coral, total }.
    """
    if current_user.role not in ("Mentor", "HOD", "Admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )

    students = db.query(Student).all()
    green = amber = coral = 0
    for s in students:
        breakdown = _build_breakdown(s)
        if breakdown.risk_band == "Green":
            green += 1
        elif breakdown.risk_band == "Amber":
            amber += 1
        else:
            coral += 1

    return schemas.RiskBandSummary(
        green=green, amber=amber, coral=coral, total=len(students)
    )


@router.get("/department-risk", response_model=List[schemas.DepartmentRiskSummary])
def get_department_risk(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Risk breakdown per department. Useful for the HOD heatmap view.
    """
    if current_user.role not in ("HOD", "Admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HOD and Admin can view department-level risk data"
        )

    students = db.query(Student).all()
    dept_map: dict = {}
    for s in students:
        dept = s.department
        if dept not in dept_map:
            dept_map[dept] = {"green": 0, "amber": 0, "coral": 0, "total": 0}
        breakdown = _build_breakdown(s)
        dept_map[dept]["total"] += 1
        if breakdown.risk_band == "Green":
            dept_map[dept]["green"] += 1
        elif breakdown.risk_band == "Amber":
            dept_map[dept]["amber"] += 1
        else:
            dept_map[dept]["coral"] += 1

    return [
        schemas.DepartmentRiskSummary(department=dept, **counts)
        for dept, counts in dept_map.items()
    ]


@router.get("/{student_id}", response_model=schemas.SuccessScoreBreakdown)
def get_student_score(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Fetch success score explanation and breakdown for a student.
    Students can fetch their own, and Mentors/HODs/Admins can query any student.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with id {student_id} not found"
        )

    # Students can only view their own score
    if current_user.role == "Student":
        if not current_user.student_profile or current_user.student_profile.id != student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Students can only view their own score"
            )

    return _build_breakdown(student)


@router.put("/{student_id}", response_model=schemas.SuccessScoreBreakdown)
def update_student_score(
    student_id: int,
    update: schemas.ScoreUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update individual metric values for a student and recompute their score.
    Only Mentors, HODs, and Admins can update scores.
    """
    if current_user.role not in ("Mentor", "HOD", "Admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with id {student_id} not found"
        )

    # Update individual metrics
    if update.attendance_score is not None:
        student.attendance_rate = update.attendance_score
    if update.academic_score is not None:
        student.cgpa = update.academic_score / 10.0  # Convert back to CGPA scale
    # engagement_score and placement_score would need new columns;
    # for now we persist them via recomputation from the stored values.

    # Recompute overall score and risk band
    breakdown = _build_breakdown(student)
    student.success_score = breakdown.overall_score
    student.risk_status = breakdown.risk_band

    db.commit()
    db.refresh(student)

    return _build_breakdown(student)


@router.post("/compute-all", response_model=schemas.BatchComputeResponse)
def compute_all_scores(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Batch recompute success scores for all students.
    Updates success_score and risk_status fields in the database.
    Only HOD and Admin can trigger batch computation.
    """
    if current_user.role not in ("HOD", "Admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HOD and Admin can trigger batch score computation"
        )

    students = db.query(Student).all()
    green = amber = coral = 0

    for student in students:
        breakdown = _build_breakdown(student)
        student.success_score = breakdown.overall_score
        student.risk_status = breakdown.risk_band

        if breakdown.risk_band == "Green":
            green += 1
        elif breakdown.risk_band == "Amber":
            amber += 1
        else:
            coral += 1

    db.commit()

    return schemas.BatchComputeResponse(
        updated_count=len(students),
        risk_summary=schemas.RiskBandSummary(
            green=green, amber=amber, coral=coral, total=len(students)
        ),
    )
