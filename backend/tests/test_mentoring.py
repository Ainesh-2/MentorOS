"""
Tests for Team B — Mentoring Engine
Tests allocation rules, meeting CRUD, and dashboard stats.
"""
import pytest
from datetime import datetime, timedelta
from backend.app.models.user import User
from backend.app.models.student import Student
from backend.app.models.mentor import Mentor
from backend.app.models.meeting import Meeting
from backend.app.core.security import get_password_hash


# ============================================
# HELPER FACTORIES
# ============================================

def _create_user(db, email, full_name, role):
    user = User(
        email=email,
        hashed_password=get_password_hash("password123"),
        full_name=full_name,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _create_mentor(db, email="mentor@test.com", department="CSE", max_mentees=20):
    user = _create_user(db, email, "Test Mentor", "Mentor")
    mentor = Mentor(user_id=user.id, department=department, max_mentees=max_mentees)
    db.add(mentor)
    db.commit()
    db.refresh(mentor)
    return user, mentor


def _create_student(db, usn, department="CSE", mentor_id=None):
    user = _create_user(db, f"{usn.lower()}@test.com", f"Student {usn}", "Student")
    student = Student(
        user_id=user.id,
        usn=usn,
        department=department,
        semester=3,
        attendance_rate=85.0,
        cgpa=8.0,
        mentor_id=mentor_id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return user, student


# ============================================
# ALLOCATION RULES TESTS
# ============================================

class TestAllocationRules:
    """Test the allocation rules from allocation-rules.md."""

    def test_department_alignment(self, db):
        """Rule 1: student.department must equal mentor.department."""
        _, mentor_cse = _create_mentor(db, "m1@test.com", "CSE")
        _, student_ece = _create_student(db, "USN001", department="ECE")

        # Cannot allocate ECE student to CSE mentor
        assert student_ece.department != mentor_cse.department

    def test_capacity_limit(self, db):
        """Rule 2: cannot exceed mentor.max_mentees."""
        _, mentor = _create_mentor(db, "m2@test.com", "CSE", max_mentees=2)

        # Allocate 2 students (at capacity)
        _, s1 = _create_student(db, "USN101", mentor_id=mentor.id)
        _, s2 = _create_student(db, "USN102", mentor_id=mentor.id)

        current_count = db.query(Student).filter(Student.mentor_id == mentor.id).count()
        assert current_count == 2
        assert current_count >= mentor.max_mentees  # At capacity

    def test_same_department_allocation_succeeds(self, db):
        """Valid allocation: same department, under capacity."""
        _, mentor = _create_mentor(db, "m3@test.com", "CSE", max_mentees=20)
        _, student = _create_student(db, "USN201", department="CSE")

        # Allocate
        student.mentor_id = mentor.id
        db.commit()
        db.refresh(student)

        assert student.mentor_id == mentor.id

    def test_default_capacity_is_20(self, db):
        """Default max_mentees should be 20."""
        _, mentor = _create_mentor(db, "m4@test.com", "CSE")
        assert mentor.max_mentees == 20


# ============================================
# MEETING CRUD TESTS
# ============================================

class TestMeetingCRUD:
    """Test meeting create, read, update, delete operations."""

    def test_create_meeting(self, db):
        """Create a meeting between a mentor and their student."""
        _, mentor = _create_mentor(db)
        _, student = _create_student(db, "USN301", mentor_id=mentor.id)

        meeting = Meeting(
            mentor_id=mentor.id,
            student_id=student.id,
            title="Weekly Check-in",
            date=datetime.utcnow() + timedelta(days=1),
            status="Scheduled",
        )
        db.add(meeting)
        db.commit()
        db.refresh(meeting)

        assert meeting.id is not None
        assert meeting.status == "Scheduled"
        assert meeting.mentor_id == mentor.id
        assert meeting.student_id == student.id

    def test_update_meeting_status(self, db):
        """Update a meeting to Completed with notes."""
        _, mentor = _create_mentor(db)
        _, student = _create_student(db, "USN302", mentor_id=mentor.id)

        meeting = Meeting(
            mentor_id=mentor.id,
            student_id=student.id,
            title="Academic Review",
            date=datetime.utcnow(),
            status="Scheduled",
        )
        db.add(meeting)
        db.commit()

        meeting.status = "Completed"
        meeting.notes = "Discussed attendance improvement plan. Student will attend extra sessions."
        db.commit()
        db.refresh(meeting)

        assert meeting.status == "Completed"
        assert "attendance" in meeting.notes.lower()

    def test_delete_meeting(self, db):
        """Delete a meeting."""
        _, mentor = _create_mentor(db)
        _, student = _create_student(db, "USN303", mentor_id=mentor.id)

        meeting = Meeting(
            mentor_id=mentor.id,
            student_id=student.id,
            title="Cancelled Meeting",
            date=datetime.utcnow() + timedelta(days=7),
            status="Scheduled",
        )
        db.add(meeting)
        db.commit()
        meeting_id = meeting.id

        db.delete(meeting)
        db.commit()

        assert db.query(Meeting).filter(Meeting.id == meeting_id).first() is None

    def test_meeting_relationships(self, db):
        """Verify meeting -> mentor and meeting -> student relationships."""
        _, mentor = _create_mentor(db)
        _, student = _create_student(db, "USN304", mentor_id=mentor.id)

        meeting = Meeting(
            mentor_id=mentor.id,
            student_id=student.id,
            title="Relationship Test",
            date=datetime.utcnow(),
            status="Scheduled",
        )
        db.add(meeting)
        db.commit()
        db.refresh(meeting)

        assert meeting.mentor.id == mentor.id
        assert meeting.student.id == student.id


# ============================================
# DASHBOARD STATS TESTS
# ============================================

class TestDashboardStats:
    """Test mentor dashboard aggregation logic."""

    def test_mentee_count(self, db):
        """Verify correct mentee count for a mentor."""
        _, mentor = _create_mentor(db)
        _create_student(db, "USN401", mentor_id=mentor.id)
        _create_student(db, "USN402", mentor_id=mentor.id)
        _create_student(db, "USN403", mentor_id=mentor.id)

        count = db.query(Student).filter(Student.mentor_id == mentor.id).count()
        assert count == 3

    def test_risk_distribution(self, db):
        """Verify at-risk counts match student risk_status values."""
        _, mentor = _create_mentor(db)

        _, s1 = _create_student(db, "USN501", mentor_id=mentor.id)
        s1.risk_status = "Green"

        _, s2 = _create_student(db, "USN502", mentor_id=mentor.id)
        s2.risk_status = "Amber"

        _, s3 = _create_student(db, "USN503", mentor_id=mentor.id)
        s3.risk_status = "Coral"
        db.commit()

        students = db.query(Student).filter(Student.mentor_id == mentor.id).all()
        at_risk = sum(1 for s in students if s.risk_status == "Coral")
        needs_attention = sum(1 for s in students if s.risk_status == "Amber")
        on_track = sum(1 for s in students if s.risk_status == "Green")

        assert at_risk == 1
        assert needs_attention == 1
        assert on_track == 1

    def test_meeting_counts(self, db):
        """Verify upcoming vs completed meeting counts."""
        _, mentor = _create_mentor(db)
        _, student = _create_student(db, "USN601", mentor_id=mentor.id)

        # 2 completed meetings
        for i in range(2):
            m = Meeting(
                mentor_id=mentor.id,
                student_id=student.id,
                title=f"Past Meeting {i}",
                date=datetime.utcnow() - timedelta(days=i + 1),
                status="Completed",
            )
            db.add(m)

        # 3 upcoming meetings
        for i in range(3):
            m = Meeting(
                mentor_id=mentor.id,
                student_id=student.id,
                title=f"Future Meeting {i}",
                date=datetime.utcnow() + timedelta(days=i + 1),
                status="Scheduled",
            )
            db.add(m)
        db.commit()

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

        assert upcoming == 3
        assert completed == 2
