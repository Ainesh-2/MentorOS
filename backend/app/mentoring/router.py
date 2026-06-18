from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.auth.router import get_current_user
from backend.app.models.user import User
from backend.app.models.student import Student
from backend.app.models.mentor import Mentor
from backend.app.models.meeting import Meeting
from backend.app.mentoring import schemas as mentoring_schemas
from backend.app.students import schemas as student_schemas

router = APIRouter()


@router.get("/roster", response_model=List[student_schemas.StudentResponse])
def get_mentor_roster(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get list of students assigned to the current mentor.
    """
    if current_user.role != "Mentor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only mentors can access their roster"
        )
    
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.id).first()
    if not mentor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mentor profile not found"
        )
        
    return mentor.students


@router.post("/meetings", response_model=mentoring_schemas.MeetingResponse)
def schedule_meeting(
    meeting_in: mentoring_schemas.MeetingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Schedule a meeting between a mentor and student.
    """
    if current_user.role != "Mentor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only mentors can schedule meetings"
        )
        
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.id).first()
    if not mentor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mentor profile not found"
        )
        
    # Verify student is in roster,
    student = db.query(Student).filter(Student.id == meeting_in.student_id).first()
    if not student or student.mentor_id != mentor.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student is not assigned to this mentor"
        )
        
    db_meeting = Meeting(
        mentor_id=mentor.id,
        student_id=meeting_in.student_id,
        title=meeting_in.title,
        date=meeting_in.date,
        notes=meeting_in.notes,
        status="Scheduled"
    )
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    return db_meeting


@router.put("/meetings/{meeting_id}", response_model=mentoring_schemas.MeetingResponse)
def update_meeting(
    meeting_id: int,
    meeting_in: mentoring_schemas.MeetingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Update meeting details (e.g. log notes and complete meeting).
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
        
    # Authorization check
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.id).first()
    if not mentor or meeting.mentor_id != mentor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to modify this meeting"
        )
        
    for field, value in meeting_in.model_dump(exclude_unset=True).items():
        setattr(meeting, field, value)
        
    db.commit()
    db.refresh(meeting)
    return meeting


@router.post("/allocate", status_code=status.HTTP_200_OK)
def allocate_student(
    allocation: mentoring_schemas.AllocationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Allocate a student to a mentor (HOD or Admin only).
    """
    if current_user.role not in ["HOD", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HOD or Admin can allocate students to mentors"
        )
        
    student = db.query(Student).filter(Student.id == allocation.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
        
    mentor = db.query(Mentor).filter(Mentor.id == allocation.mentor_id).first()
    if not mentor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mentor not found"
        )
        
    student.mentor_id = mentor.id
    db.commit()
    return {"message": f"Successfully allocated Student {student.usn} to Mentor {mentor.user.full_name}"}
