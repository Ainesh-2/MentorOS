from typing import Any, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from backend.app.core.database import get_db
from backend.app.auth.router import get_current_user
from backend.app.models.user import User
from backend.app.models.student import Student
from backend.app.models.mentor import Mentor
from backend.app.models.meeting import Meeting
from backend.app.mentoring import schemas as mentoring_schemas
from backend.app.students import schemas as student_schemas
from backend.app.scoring.router import compute_success_score, get_risk_band

router = APIRouter()


# ============================================
# HELPER — Resolve mentor from current user
# ============================================

def _get_mentor_for_user(db: Session, current_user: User) -> Mentor:
    """Get the Mentor record associated with the logged-in user."""
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.id).first()
    if not mentor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No mentor profile found for current user"
        )
    return mentor


def _enrich_meeting(meeting: Meeting, db: Session) -> mentoring_schemas.MeetingResponse:
    """Turn a Meeting ORM object into a MeetingResponse with student/mentor names."""
    student = db.query(Student).filter(Student.id == meeting.student_id).first()
    mentor = db.query(Mentor).filter(Mentor.id == meeting.mentor_id).first()

    student_name = student.user.full_name if student and student.user else "Unknown"
    mentor_name = mentor.user.full_name if mentor and mentor.user else "Unknown"

    return mentoring_schemas.MeetingResponse(
        id=meeting.id,
        title=meeting.title,
        date=meeting.date,
        notes=meeting.notes,
        status=meeting.status,
        mentor_id=meeting.mentor_id,
        student_id=meeting.student_id,
        student_name=student_name,
        mentor_name=mentor_name,
    )


# ============================================
# ROSTER ENDPOINTS
# ============================================

@router.get("/roster", response_model=List[mentoring_schemas.MentorRosterItem])
def get_mentor_roster(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get list of students assigned to the current mentor, enriched with
    score data, risk status, and meeting context.
    """
    if current_user.role != "Mentor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only mentors can access their roster"
        )

    mentor = _get_mentor_for_user(db, current_user)
    students = db.query(Student).filter(Student.mentor_id == mentor.id).all()

    now = datetime.utcnow()
    roster_items = []

    for student in students:
        # Last completed meeting
        last_meeting = (
            db.query(Meeting)
            .filter(
                Meeting.mentor_id == mentor.id,
                Meeting.student_id == student.id,
                Meeting.status == "Completed",
            )
            .order_by(Meeting.date.desc())
            .first()
        )

        # Next scheduled meeting
        next_meeting = (
            db.query(Meeting)
            .filter(
                Meeting.mentor_id == mentor.id,
                Meeting.student_id == student.id,
                Meeting.status == "Scheduled",
                Meeting.date >= now,
            )
            .order_by(Meeting.date.asc())
            .first()
        )

        roster_items.append(
            mentoring_schemas.MentorRosterItem(
                student_id=student.id,
                usn=student.usn,
                full_name=student.user.full_name if student.user else "Unknown",
                email=student.user.email if student.user else "",
                department=student.department,
                semester=student.semester,
                attendance_rate=student.attendance_rate or 0.0,
                cgpa=student.cgpa or 0.0,
                success_score=student.success_score or 0.0,
                risk_status=student.risk_status or "Green",
                consent_given=student.consent_given,
                last_meeting=_enrich_meeting(last_meeting, db) if last_meeting else None,
                next_meeting=_enrich_meeting(next_meeting, db) if next_meeting else None,
                open_action_items=0,  # Can be extended when action_items table exists
            )
        )

    return roster_items


# ============================================
# ALLOCATION ENDPOINTS
# ============================================

@router.post("/allocate", response_model=mentoring_schemas.AllocationResponse)
def allocate_student(
    request: mentoring_schemas.AllocationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Allocate a student to a mentor.
    Enforces:
      1. Department alignment (student.department == mentor.department)
      2. Capacity limits (current mentees < mentor.max_mentees)
    Only HOD and Admin can allocate.
    """
    if current_user.role not in ("HOD", "Admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HOD and Admin can allocate students"
        )

    student = db.query(Student).filter(Student.id == request.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with id {request.student_id} not found"
        )

    mentor = db.query(Mentor).filter(Mentor.id == request.mentor_id).first()
    if not mentor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mentor with id {request.mentor_id} not found"
        )

    # Rule 1: Department alignment
    if student.department != mentor.department:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department mismatch: student is in '{student.department}', mentor is in '{mentor.department}'. "
                   f"Inter-departmental mentoring is not allowed."
        )

    # Rule 2: Capacity check
    current_mentee_count = db.query(Student).filter(Student.mentor_id == mentor.id).count()
    if current_mentee_count >= mentor.max_mentees:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mentor has reached maximum capacity ({mentor.max_mentees} mentees). "
                   f"Cannot allocate more students."
        )

    # Check if student is already allocated
    if student.mentor_id is not None:
        old_mentor = db.query(Mentor).filter(Mentor.id == student.mentor_id).first()
        old_name = old_mentor.user.full_name if old_mentor and old_mentor.user else "Unknown"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student is already allocated to mentor '{old_name}' (id={student.mentor_id}). "
                   f"Deallocate first before reassigning."
        )

    # Perform allocation
    student.mentor_id = mentor.id
    db.commit()
    db.refresh(student)

    return mentoring_schemas.AllocationResponse(
        student_id=student.id,
        mentor_id=mentor.id,
        student_name=student.user.full_name if student.user else "Unknown",
        mentor_name=mentor.user.full_name if mentor.user else "Unknown",
        department=student.department,
        message="Student successfully allocated to mentor",
    )


@router.delete("/allocate/{student_id}", response_model=mentoring_schemas.AllocationResponse)
def deallocate_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Remove a student from their currently assigned mentor.
    Only HOD and Admin can deallocate.
    """
    if current_user.role not in ("HOD", "Admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HOD and Admin can deallocate students"
        )

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with id {student_id} not found"
        )

    if student.mentor_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student is not currently allocated to any mentor"
        )

    old_mentor = db.query(Mentor).filter(Mentor.id == student.mentor_id).first()
    old_mentor_name = old_mentor.user.full_name if old_mentor and old_mentor.user else "Unknown"

    student.mentor_id = None
    db.commit()
    db.refresh(student)

    return mentoring_schemas.AllocationResponse(
        student_id=student.id,
        mentor_id=old_mentor.id if old_mentor else 0,
        student_name=student.user.full_name if student.user else "Unknown",
        mentor_name=old_mentor_name,
        department=student.department,
        message="Student successfully deallocated from mentor",
    )


# ============================================
# MEETING ENDPOINTS
# ============================================

@router.get("/meetings", response_model=List[mentoring_schemas.MeetingResponse])
def get_meetings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get all meetings for the current mentor.
    Students see their own meetings, mentors see their roster's meetings.
    HODs and Admins see all meetings.
    """
    if current_user.role == "Mentor":
        mentor = _get_mentor_for_user(db, current_user)
        meetings = db.query(Meeting).filter(Meeting.mentor_id == mentor.id).order_by(Meeting.date.desc()).all()
    elif current_user.role == "Student":
        student = current_user.student_profile
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No student profile found")
        meetings = db.query(Meeting).filter(Meeting.student_id == student.id).order_by(Meeting.date.desc()).all()
    elif current_user.role in ("HOD", "Admin"):
        meetings = db.query(Meeting).order_by(Meeting.date.desc()).all()
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    return [_enrich_meeting(m, db) for m in meetings]


@router.post("/meetings", response_model=mentoring_schemas.MeetingResponse, status_code=status.HTTP_201_CREATED)
def schedule_meeting(
    meeting_data: mentoring_schemas.MeetingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Schedule a new meeting with a student.
    Mentors can only schedule meetings with their own mentees.
    """
    if current_user.role != "Mentor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only mentors can schedule meetings"
        )

    mentor = _get_mentor_for_user(db, current_user)

    # Verify the student is in this mentor's roster
    student = db.query(Student).filter(
        Student.id == meeting_data.student_id,
        Student.mentor_id == mentor.id,
    ).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student is not in your roster. You can only schedule meetings with your own mentees."
        )

    new_meeting = Meeting(
        mentor_id=mentor.id,
        student_id=meeting_data.student_id,
        title=meeting_data.title,
        date=meeting_data.date,
        notes=meeting_data.notes,
        status=meeting_data.status or "Scheduled",
    )
    db.add(new_meeting)
    db.commit()
    db.refresh(new_meeting)

    return _enrich_meeting(new_meeting, db)


@router.get("/meetings/{meeting_id}", response_model=mentoring_schemas.MeetingResponse)
def get_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get a specific meeting by ID."""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting with id {meeting_id} not found"
        )

    # Access control
    if current_user.role == "Mentor":
        mentor = _get_mentor_for_user(db, current_user)
        if meeting.mentor_id != mentor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your meeting")
    elif current_user.role == "Student":
        student = current_user.student_profile
        if not student or meeting.student_id != student.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your meeting")

    return _enrich_meeting(meeting, db)


@router.put("/meetings/{meeting_id}", response_model=mentoring_schemas.MeetingResponse)
def update_meeting(
    meeting_id: int,
    update: mentoring_schemas.MeetingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update a meeting — add notes, change date/title, or mark as Completed/Cancelled.
    Only the owning mentor can update.
    """
    if current_user.role != "Mentor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only mentors can update meetings"
        )

    mentor = _get_mentor_for_user(db, current_user)
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id,
        Meeting.mentor_id == mentor.id,
    ).first()

    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting with id {meeting_id} not found or doesn't belong to you"
        )

    # Apply updates
    if update.title is not None:
        meeting.title = update.title
    if update.date is not None:
        meeting.date = update.date
    if update.notes is not None:
        meeting.notes = update.notes
    if update.status is not None:
        meeting.status = update.status

    db.commit()
    db.refresh(meeting)

    return _enrich_meeting(meeting, db)


@router.delete("/meetings/{meeting_id}")
def delete_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Delete a meeting. Only the owning mentor can delete."""
    if current_user.role != "Mentor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only mentors can delete meetings"
        )

    mentor = _get_mentor_for_user(db, current_user)
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id,
        Meeting.mentor_id == mentor.id,
    ).first()

    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting with id {meeting_id} not found or doesn't belong to you"
        )

    db.delete(meeting)
    db.commit()

    return {"message": f"Meeting {meeting_id} deleted successfully"}


# ============================================
# MENTOR DASHBOARD
# ============================================

@router.get("/dashboard", response_model=mentoring_schemas.MentorDashboardStats)
def get_mentor_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get aggregated dashboard statistics for the current mentor:
    - Total mentees count
    - At-risk / needs-attention / on-track counts
    - Upcoming and completed meeting counts
    - Average success score
    """
    if current_user.role != "Mentor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only mentors can access their dashboard"
        )

    mentor = _get_mentor_for_user(db, current_user)
    students = db.query(Student).filter(Student.mentor_id == mentor.id).all()

    at_risk = sum(1 for s in students if s.risk_status == "Coral")
    needs_attention = sum(1 for s in students if s.risk_status == "Amber")
    on_track = sum(1 for s in students if s.risk_status == "Green")

    now = datetime.utcnow()
    upcoming = db.query(Meeting).filter(
        Meeting.mentor_id == mentor.id,
        Meeting.status == "Scheduled",
        Meeting.date >= now,
    ).count()

    completed = db.query(Meeting).filter(
        Meeting.mentor_id == mentor.id,
        Meeting.status == "Completed",
    ).count()

    avg_score = (
        sum(s.success_score or 0.0 for s in students) / len(students)
        if students
        else 0.0
    )

    return mentoring_schemas.MentorDashboardStats(
        total_mentees=len(students),
        at_risk_count=at_risk,
        needs_attention_count=needs_attention,
        on_track_count=on_track,
        upcoming_meetings=upcoming,
        completed_meetings=completed,
        avg_success_score=round(avg_score, 2),
    )
