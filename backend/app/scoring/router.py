from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.auth.router import get_current_user
from backend.app.models.user import User
from backend.app.models.student import Student
from backend.app.scoring import schemas
from backend.app.scoring.engine import ScoringEngine, recompute_and_store

router = APIRouter()


@router.get("/{student_id}", response_model=schemas.SuccessScoreBreakdown)
def get_student_score(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Fetch the real (Phase-3, SGPA-variant) success score breakdown for a student.
    Students can fetch their own; Mentors/HODs/Admins can query any student.

    Read-only: this computes the breakdown from source tables and does NOT
    persist anything (persistence happens via the nightly job / recompute).
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

    data = ScoringEngine(db).compute_success_score(student_id, settings.SCORING_PERIOD)
    return {**data, "usn": student.usn}


@router.post("/batch-recalculate", status_code=status.HTTP_200_OK)
def run_batch_recalculation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Recalculate + persist real success scores for all students (HOD / Admin).
    Uses the Phase-3 engine and writes history rows + mirrors to the students
    table — the same path as POST /admin/scores/recompute.
    """
    if current_user.role not in ["HOD", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HOD or Admin can trigger success score batch jobs"
        )

    count = recompute_and_store(db, settings.SCORING_PERIOD)
    return {"message": f"Successfully ran batch job. Recalculated scores for {count} students."}
