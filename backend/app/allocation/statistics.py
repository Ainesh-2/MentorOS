"""Statistics aggregation helpers for the allocation module."""
from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from backend.app.allocation.repository import get_allocation_stats
from backend.app.allocation.schemas import (
    AllocationStatistics,
    DepartmentStatistics,
    MenteeSummary,
    MentorWorkload,
)
from backend.app.models.mentor import Mentor
from backend.app.models.student import Student


def _student_full_name(student: Student) -> str:
    """Return the display name for a student from the linked user record."""
    user = getattr(student, "user", None)
    return user.full_name if user is not None else ""


def build_statistics(db: Session) -> AllocationStatistics:
    """Build aggregate allocation statistics for the statistics endpoint.

    Args:
        db: Active SQLAlchemy session.

    Returns:
        ``AllocationStatistics`` with totals and per-department breakdown.
    """
    raw = get_allocation_stats(db)
    by_department = {
        department: DepartmentStatistics(**counts)
        for department, counts in raw["by_department"].items()
    }
    return AllocationStatistics(
        total_students=raw["total_students"],
        total_mentors=raw["total_mentors"],
        allocated=raw["allocated"],
        pending=raw["pending"],
        by_department=by_department,
    )


def build_workload(db: Session) -> list[MentorWorkload]:
    """Build per-mentor workload breakdown with assigned mentee lists.

    Args:
        db: Active SQLAlchemy session.

    Returns:
        One ``MentorWorkload`` entry per mentor, including current load and mentees.
    """
    mentors = (
        db.query(Mentor)
        .options(
            joinedload(Mentor.user),
            joinedload(Mentor.students).joinedload(Student.user),
        )
        .all()
    )

    workloads: list[MentorWorkload] = []
    for mentor in mentors:
        mentees = [
            MenteeSummary(
                id=student.id,
                usn=student.usn,
                full_name=_student_full_name(student),
                risk_status=student.risk_status,
            )
            for student in mentor.students
        ]
        mentor_user = getattr(mentor, "user", None)
        workloads.append(
            MentorWorkload(
                mentor_id=mentor.id,
                mentor_name=mentor_user.full_name if mentor_user is not None else "",
                department=mentor.department,
                current=len(mentees),
                max=mentor.max_mentees,
                mentees=mentees,
            )
        )
    return workloads
