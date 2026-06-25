"""
Regression tests for three fixes:
  1. GET /scoring/{id} uses the real engine, returns the total_score/risk_category
     contract (nullable + insufficient_data), and is read-only (no write-on-read).
  2. POST /scoring/batch-recalculate persists via the engine (history rows).
  3. Legacy PUT /students/me/consent blocks under-18 and syncs per-category rows.
"""
from backend.app.core.security import create_access_token
from backend.app.models.user import User
from backend.app.models.student import Student
from backend.app.models.academic import AttendanceRecord, StudentSuccessScore
from backend.app.models.consent import StudentConsent, ConsentCategory

PERIOD = "2025-ODD"


def mk(db, usn, sgpa=None, role="Student", under18=False):
    u = User(email=f"{usn}@x.edu", hashed_password="x", full_name=usn, role=role, is_active=True)
    db.add(u)
    db.commit()
    db.refresh(u)
    s = Student(user_id=u.id, usn=usn, department="CSE", semester=5, sgpa=sgpa, is_under_18=under18)
    db.add(s)
    db.commit()
    db.refresh(s)
    return u, s


def auth(user):
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


# ----- 1. scoring endpoint ------------------------------------------------

def test_get_score_insufficient_data_and_read_only(client, db):
    u, s = mk(db, "SC1")  # no sgpa, no attendance
    r = client.get(f"/api/v1/scoring/{s.id}", headers=auth(u))
    assert r.status_code == 200
    body = r.json()
    assert body["total_score"] is None
    assert body["risk_category"] == "insufficient_data"
    assert "academic_component" in body and body["academic_component"] is None
    # read-only: GET must not persist a score row
    assert db.query(StudentSuccessScore).count() == 0


def test_get_score_real_components(client, db):
    u, s = mk(db, "SC2", sgpa=8.0)
    db.add(AttendanceRecord(student_id=s.id, subject_code="CS101", total_classes=50, attended_classes=45, period=PERIOD))
    db.commit()
    r = client.get(f"/api/v1/scoring/{s.id}", headers=auth(u))
    assert r.status_code == 200
    body = r.json()
    # att=90, acad=80, eng 0, place 0 → 59.5 amber
    assert body["total_score"] == 59.5
    assert body["risk_category"] == "amber"
    assert body["academic_component"] == 80.0  # SGPA×10, not CGPA


def test_get_score_student_cannot_view_other(client, db):
    _, a = mk(db, "SC3")
    ub, _ = mk(db, "SC4")
    r = client.get(f"/api/v1/scoring/{a.id}", headers=auth(ub))
    assert r.status_code == 403


# ----- 2. batch-recalculate persists -------------------------------------

def test_batch_recalculate_persists_history(client, db):
    hod, _ = mk(db, "HOD1", role="HOD")
    _, s = mk(db, "SC5", sgpa=7.0)
    db.add(AttendanceRecord(student_id=s.id, subject_code="CS101", total_classes=50, attended_classes=40, period=PERIOD))
    db.commit()
    r = client.post("/api/v1/scoring/batch-recalculate", headers=auth(hod))
    assert r.status_code == 200
    assert db.query(StudentSuccessScore).filter(StudentSuccessScore.student_id == s.id).count() == 1


# ----- 3. legacy consent --------------------------------------------------

def test_legacy_consent_blocks_under_18(client, db):
    u, _ = mk(db, "SC6", under18=True)
    r = client.put("/api/v1/students/me/consent", headers=auth(u), json={"consent_given": False})
    assert r.status_code == 403
    assert "under 18" in r.json()["detail"].lower()


def test_legacy_consent_syncs_per_category(client, db):
    u, s = mk(db, "SC7")
    r = client.put("/api/v1/students/me/consent", headers=auth(u), json={"consent_given": False})
    assert r.status_code == 200
    db.refresh(s)
    assert s.consent_given is False
    rows = {c.category for c in db.query(StudentConsent).filter(StudentConsent.student_id == s.id).all()}
    assert rows == {ConsentCategory.academic, ConsentCategory.attendance, ConsentCategory.placement}
    assert all(
        c.consented is False
        for c in db.query(StudentConsent).filter(StudentConsent.student_id == s.id).all()
    )
