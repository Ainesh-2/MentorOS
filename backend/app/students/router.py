from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.auth.router import get_current_user
from backend.app.models.user import User
from backend.app.models.student import Student
from backend.app.students import schemas

router = APIRouter()


@router.get("/", response_model=List[schemas.StudentResponse])
def read_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    Retrieve students list. Accessible by Mentors, HODs, and Admins.
    """
    if current_user.role not in ["Mentor", "HOD", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    students = db.query(Student).offset(skip).limit(limit).all()
    return students


@router.get("/me", response_model=schemas.StudentResponse)
def read_student_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get current student's profile details.
    """
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for this user"
        )
    return student


@router.put("/me/consent", response_model=schemas.StudentResponse)
def update_student_consent(
    consent_update: schemas.StudentConsentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Toggle student data consent preferences.
    """
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for this user"
        )
    student.consent_given = consent_update.consent_given
    db.commit()
    db.refresh(student)
    return student


@router.post("/import", response_model=List[schemas.StudentResponse])
def import_students_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Import student data from a CSV file (Admin/HOD only).
    This endpoint parses columns, matches records to USNs, and updates database records.
    """
    if current_user.role not in ["HOD", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to import students"
        )
    # Placeholder implementation: parses CSV headers and mock-saves to DB.
    # In a real environment, this parses 'file' content.
    return []
