from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.auth.router import get_current_user
from backend.app.models.user import User
from backend.app.models.student import Student
from backend.app.models.meeting import Meeting
from backend.app.admin import schemas

router = APIRouter()


@router.get("/compliance-export", response_model=schemas.ComplianceReport)
def get_compliance_report(
    department: str,
    accreditation_type: str = "NAAC",  # NAAC or NBA
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Generate student success and mentoring logs summary reports for accreditation (NAAC/NBA).
    """
    if current_user.role not in ["HOD", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admins or HODs can export accreditation reports"
        )
        
    students = db.query(Student).filter(Student.department == department).all()
    total_students = len(students)
    
    # Calculate risk counts
    risk_summary = {"Green": 0, "Amber": 0, "Coral": 0}
    for s in students:
        if s.risk_status in risk_summary:
            risk_summary[s.risk_status] += 1
            
    # Count meeting logs (completed meetings)
    meetings_count = db.query(Meeting).filter(
        Meeting.status == "Completed"
    ).count()
    
    return {
        "department": department,
        "academic_year": "2025-2026",
        "generated_at": datetime.now(timezone.utc),
        "total_students": total_students,
        "risk_summary": risk_summary,
        "mentoring_meetings_logged": meetings_count,
        "accreditation_type": accreditation_type
    }


@router.post("/user-action", status_code=status.HTTP_200_OK)
def perform_user_action(
    action_in: schemas.UserMgmtAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Enable/disable users or modify roles (Admin only).
    """
    if current_user.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admins can perform user management tasks"
        )
        
    target_user = db.query(User).filter(User.id == action_in.user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found"
        )
        
    if action_in.action == "activate":
        target_user.is_active = True
    elif action_in.action == "deactivate":
        target_user.is_active = False
    elif action_in.action == "change_role":
        if action_in.target_role not in ["Student", "Mentor", "HOD", "Admin"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid target role"
            )
        target_user.role = action_in.target_role
        
    db.commit()
    return {"message": f"Successfully performed action '{action_in.action}' on User ID {action_in.user_id}"}
