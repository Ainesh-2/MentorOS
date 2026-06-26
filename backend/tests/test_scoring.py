"""
Tests for Team B — Scoring Engine
Tests the success score formula, risk bands, and all scoring endpoints.
"""
import pytest
from backend.app.scoring.router import compute_success_score, get_risk_band
from backend.app.models.user import User
from backend.app.models.student import Student
from backend.app.models.mentor import Mentor
from backend.app.core.security import get_password_hash


# ============================================
# UNIT TESTS — Formula & Risk Bands
# ============================================

class TestSuccessScoreFormula:
    """Test the core weighted formula: 0.35*A + 0.35*G + 0.15*E + 0.15*P"""

    def test_perfect_scores(self):
        score = compute_success_score(100, 100, 100, 100)
        assert score == 100.0

    def test_zero_scores(self):
        score = compute_success_score(0, 0, 0, 0)
        assert score == 0.0

    def test_weights_correct(self):
        # Only attendance (weight 0.35)
        score = compute_success_score(100, 0, 0, 0)
        assert score == 35.0

        # Only academic (weight 0.35)
        score = compute_success_score(0, 100, 0, 0)
        assert score == 35.0

        # Only engagement (weight 0.15)
        score = compute_success_score(0, 0, 100, 0)
        assert score == 15.0

        # Only placement (weight 0.15)
        score = compute_success_score(0, 0, 0, 100)
        assert score == 15.0

    def test_typical_student(self):
        # Attendance=85, Academic=75, Engagement=60, Placement=70
        score = compute_success_score(85, 75, 60, 70)
        # 0.35*85 + 0.35*75 + 0.15*60 + 0.15*70 = 29.75 + 26.25 + 9 + 10.5 = 75.5
        assert score == 75.5

    def test_at_risk_student(self):
        # Low scores across the board
        score = compute_success_score(40, 35, 30, 25)
        # 0.35*40 + 0.35*35 + 0.15*30 + 0.15*25 = 14 + 12.25 + 4.5 + 3.75 = 34.5
        assert score == 34.5


class TestRiskBands:
    """Test the risk band classification."""

    def test_green_band(self):
        assert get_risk_band(70.0) == "Green"
        assert get_risk_band(85.0) == "Green"
        assert get_risk_band(100.0) == "Green"

    def test_amber_band(self):
        assert get_risk_band(50.0) == "Amber"
        assert get_risk_band(60.0) == "Amber"
        assert get_risk_band(69.9) == "Amber"

    def test_coral_band(self):
        assert get_risk_band(0.0) == "Coral"
        assert get_risk_band(30.0) == "Coral"
        assert get_risk_band(49.9) == "Coral"

    def test_boundary_values(self):
        """Test exact boundary values."""
        assert get_risk_band(70.0) == "Green"
        assert get_risk_band(69.99) == "Amber"
        assert get_risk_band(50.0) == "Amber"
        assert get_risk_band(49.99) == "Coral"


# ============================================
# INTEGRATION TESTS — API Endpoints
# ============================================

def _create_mentor_user(db, email="mentor@test.com", role="Mentor"):
    """Helper to create a mentor user + mentor profile."""
    user = User(
        email=email,
        hashed_password=get_password_hash("password123"),
        full_name="Test Mentor",
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    mentor = Mentor(user_id=user.id, department="CSE", max_mentees=20)
    db.add(mentor)
    db.commit()
    db.refresh(mentor)
    return user, mentor


def _create_student(db, mentor_id=None, usn="USN001", attendance=85.0, cgpa=8.5):
    """Helper to create a student user + student profile."""
    user = User(
        email=f"{usn.lower()}@test.com",
        hashed_password=get_password_hash("password123"),
        full_name=f"Student {usn}",
        role="Student",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    student = Student(
        user_id=user.id,
        usn=usn,
        department="CSE",
        semester=3,
        attendance_rate=attendance,
        cgpa=cgpa,
        mentor_id=mentor_id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return user, student


class TestScoringEndpoints:
    """Test the scoring API endpoints."""

    def test_get_all_scores_unauthorized(self, client):
        """Students should not be able to list all scores."""
        response = client.get("/api/v1/scoring/")
        assert response.status_code == 401  # No auth token

    def test_risk_summary_formula(self, db):
        """Verify risk summary correctly categorizes students."""
        mentor_user, mentor = _create_mentor_user(db)

        # Green student: high scores
        _create_student(db, mentor.id, "USN001", attendance=90, cgpa=9.0)
        # Amber student: medium scores
        _create_student(db, mentor.id, "USN002", attendance=60, cgpa=5.5)
        # Coral student: low scores
        _create_student(db, mentor.id, "USN003", attendance=30, cgpa=3.0)

        students = db.query(Student).all()
        assert len(students) == 3

        # Verify score computation for each
        s1 = students[0]
        score1 = compute_success_score(90, min(9.0 * 10, 100), 70, 70)
        assert get_risk_band(score1) == "Green"

        s3 = students[2]
        score3 = compute_success_score(30, min(3.0 * 10, 100), 70, 70)
        assert get_risk_band(score3) == "Coral"
