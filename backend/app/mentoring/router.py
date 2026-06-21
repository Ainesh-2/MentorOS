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


@router.post("/allocate/auto", status_code=status.HTTP_200_OK)
def auto_allocate_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Automatically allocate unallocated students to mentors in the same department using a Min Heap
    to balance mentor workloads (HOD or Admin only). Prioritizes students flagged as Coral or Amber.
    """
    if current_user.role not in ["HOD", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HOD or Admin can trigger auto-allocation"
        )
        
    students = db.query(Student).filter(Student.mentor_id == None).all()
    mentors = db.query(Mentor).all()
    
    if not students:
        return {"message": "No unallocated students found.", "allocated_count": 0}
    if not mentors:
        raise HTTPException(status_code=400, detail="No mentors registered in the system.")
        
    # Calculate current mentee counts for all mentors
    mentor_counts = {}
    for m in mentors:
        mentor_counts[m.id] = db.query(Student).filter(Student.mentor_id == m.id).count()
        
    # Group unallocated students by department
    students_by_dept = {}
    for s in students:
        dept = s.department
        if dept not in students_by_dept:
            students_by_dept[dept] = []
        students_by_dept[dept].append(s)
        
    # Group mentors by department
    mentors_by_dept = {}
    for m in mentors:
        dept = m.department
        if dept not in mentors_by_dept:
            mentors_by_dept[dept] = []
        mentors_by_dept[dept].append(m)
        
    allocations_count = 0
    import heapq
    
    # Perform auto-allocation for each department
    for dept, dept_students in students_by_dept.items():
        dept_mentors = mentors_by_dept.get(dept, [])
        if not dept_mentors:
            continue
            
        # Prioritize students by risk status: Coral (Critical) first, then Amber, then Green/others
        risk_priority = {"Coral": 1, "Amber": 2, "Green": 3}
        dept_students.sort(key=lambda s: risk_priority.get(s.risk_status, 3))
        
        # Build min heap of (current_mentee_count, unique_counter, mentor)
        heap = []
        counter = 0
        for m in dept_mentors:
            curr_count = mentor_counts[m.id]
            max_cap = m.max_mentees or 20
            if curr_count < max_cap:
                heapq.heappush(heap, (curr_count, counter, m))
                counter += 1
                
        for s in dept_students:
            if not heap:
                break # All mentors in this department are at full capacity
                
            curr_count, idx, mentor = heapq.heappop(heap)
            
            # Assign student to this mentor
            s.mentor_id = mentor.id
            allocations_count += 1
            
            # Update mentor count
            mentor_counts[mentor.id] += 1
            new_count = mentor_counts[mentor.id]
            
            # Push back if still under max capacity
            max_cap = mentor.max_mentees or 20
            if new_count < max_cap:
                heapq.heappush(heap, (new_count, idx, mentor))
                
    db.commit()
    return {"message": f"Successfully allocated {allocations_count} students to mentors.", "allocated_count": allocations_count}

