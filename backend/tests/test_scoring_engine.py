"""
Phase 3 scoring engine tests (SGPA variant) — run on in-memory SQLite.
Covers the four components, the insufficient_data aggregation rule, the
recompute endpoint (synchronous fallback), and CSV import → score wiring.
"""
import io

from backend.app.core.security import create_access_token
from backend.app.models.user import User
from backend.app.models.student import Student
from backend.app.models.academic import (
    Subject,
    AttendanceRecord,
    LmsActivityRecord,
    PlacementProfile,
    StudentSuccessScore,
)
from backend.app.scoring.engine import ScoringEngine

PERIOD = "2025-ODD"


def make_subject(db, code="CS101", name="Data Structures"):
    subject = Subject(subject_code=code, subject_name=name,credits=4, department="CSE")
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


def make_student(db, usn, sgpa=None, role="Student"):
    u = User(email=f"{usn}@x.edu", hashed_password="x", full_name=usn, role=role, is_active=True)
    db.add(u)
    db.commit()
    db.refresh(u)
    s = Student(user_id=u.id, usn=usn, department="CSE", semester=5, sgpa=sgpa)
    db.add(s)
    db.commit()
    db.refresh(s)
    return u, s


def auth(user):
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


# ----- components ---------------------------------------------------------

def test_attendance_full_data(db):
    _, s = make_student(db, "A1")
    subject1 = make_subject(db, "CS101", "Data Structures")
    subject2 = make_subject(db, "MA201", "Mathematics")

    db.add_all([
        AttendanceRecord(student_id=s.id,subject_id=subject1.id,total_classes=50,attended_classes=45,period=PERIOD,),
        AttendanceRecord(student_id=s.id,subject_id=subject2.id,total_classes=40,attended_classes=40,period=PERIOD,),
    ])
    db.commit()
    assert ScoringEngine(db).attendance_component(s.id, PERIOD) == 95.0


def test_attendance_no_data_returns_none(db):
    _, s = make_student(db, "A2")
    assert ScoringEngine(db).attendance_component(s.id, PERIOD) is None


def test_academic_uses_sgpa(db):
    _, s = make_student(db, "A3", sgpa=7.5)
    assert ScoringEngine(db).academic_component(s.id) == 75.0


def test_academic_no_sgpa_returns_none(db):
    _, s = make_student(db, "A4", sgpa=None)
    assert ScoringEngine(db).academic_component(s.id) is None


def test_engagement_component(db):
    _, s = make_student(db, "A5")
    db.add(LmsActivityRecord(student_id=s.id, period=PERIOD, login_count=25,
                             assignments_submitted=18, assignments_total=20))
    db.commit()
    # cohort avg = 25 (only record) → login_norm 100; submission 90 → 95
    assert ScoringEngine(db).engagement_component(s.id, PERIOD) == 95.0


def test_engagement_cohort_is_department_scoped(db):
    # CSE cohort avg logins = (10 + 30) / 2 = 20; ECE student must not affect it.
    _, s1 = make_student(db, "CSE1")
    _, s2 = make_student(db, "CSE2")
    eu = User(email="ece@x.edu", hashed_password="x", full_name="E", role="Student", is_active=True)
    db.add(eu)
    db.commit()
    db.refresh(eu)
    e1 = Student(user_id=eu.id, usn="ECE1", department="ECE", semester=5)
    db.add(e1)
    db.commit()
    db.refresh(e1)
    db.add_all([
        LmsActivityRecord(student_id=s1.id, period=PERIOD, login_count=10, assignments_submitted=10, assignments_total=10),
        LmsActivityRecord(student_id=s2.id, period=PERIOD, login_count=30, assignments_submitted=0, assignments_total=10),
        LmsActivityRecord(student_id=e1.id, period=PERIOD, login_count=100, assignments_submitted=10, assignments_total=10),
    ])
    db.commit()
    # s1: login_norm = min(10/20*100,100)=50; submission=100 → (50+100)/2 = 75
    assert ScoringEngine(db).engagement_component(s1.id, PERIOD) == 75.0


def test_placement_full_profile(db):
    _, s = make_student(db, "A6")
    db.add(PlacementProfile(student_id=s.id, has_resume=True, skills_count=4, certifications_count=2))
    db.commit()
    # 40 + 4*8 + 2*4 = 80
    assert ScoringEngine(db).placement_component(s.id) == 80.0


def test_placement_no_profile_returns_zero(db):
    _, s = make_student(db, "A7")
    assert ScoringEngine(db).placement_component(s.id) == 0.0


def test_placement_caps_at_five(db):
    _, s = make_student(db, "A7b")
    db.add(PlacementProfile(student_id=s.id, has_resume=True, skills_count=9, certifications_count=9))
    db.commit()
    # 40 + min(9,5)*8 + min(9,5)*4 = 40 + 40 + 20 = 100
    assert ScoringEngine(db).placement_component(s.id) == 100.0


# ----- aggregation --------------------------------------------------------

def test_aggregate_insufficient_when_attendance_missing(db):
    _, s = make_student(db, "B1", sgpa=7.0)  # has academic, no attendance
    result = ScoringEngine(db).compute_success_score(s.id, PERIOD)
    assert result["total_score"] is None
    assert result["risk_category"] == "insufficient_data"


def test_aggregate_insufficient_when_academic_missing(db):
    _, s = make_student(db, "B2", sgpa=None)
    subject = make_subject(db)
    db.add(AttendanceRecord(student_id=s.id,subject_id=subject.id,total_classes=50,attended_classes=45,period=PERIOD,))
    db.commit()
    result = ScoringEngine(db).compute_success_score(s.id, PERIOD)
    assert result["total_score"] is None
    assert result["risk_category"] == "insufficient_data"


def test_aggregate_green(db):
    _, s = make_student(db, "B3", sgpa=8.0)
    subject = make_subject(db)
    db.add_all([
        AttendanceRecord(student_id=s.id, subject_id=subject.id, total_classes=50, attended_classes=48, period=PERIOD),
        LmsActivityRecord(student_id=s.id, period=PERIOD, login_count=25, assignments_submitted=19, assignments_total=20),
        PlacementProfile(student_id=s.id, has_resume=True, skills_count=3, certifications_count=1),
    ])
    db.commit()
    result = ScoringEngine(db).compute_success_score(s.id, PERIOD)
    # att=96, acad=80, eng=97.5, place=68 → 86.425
    assert result["risk_category"] == "green"
    assert result["total_score"] > 70


def test_store_score_writes_history_and_mirror(db):
    _, s = make_student(db, "B4", sgpa=4.0)
    subject = make_subject(db)
    db.add(AttendanceRecord(student_id=s.id, subject_id=subject.id, total_classes=50, attended_classes=20, period=PERIOD))
    db.commit()
    ScoringEngine(db).store_score(s.id, PERIOD)
    rows = db.query(StudentSuccessScore).filter(StudentSuccessScore.student_id == s.id).all()
    assert len(rows) == 1
    db.refresh(s)
    # att=40, acad=40, eng=0, place=0 → 28 → coral; mirror capitalised
    assert rows[0].risk_category == "coral"
    assert s.risk_status == "Coral"


# ----- endpoints ----------------------------------------------------------

def test_recompute_endpoint_persists(client, db):
    admin, _ = make_student(db, "ADM", role="Admin")
    _, s = make_student(db, "S1", sgpa=8.0)
    subject = make_subject(db)
    db.add(AttendanceRecord(student_id=s.id, subject_id=subject.id, total_classes=50, attended_classes=45, period=PERIOD))
    db.commit()

    r = client.post("/api/v1/admin/scores/recompute", headers=auth(admin))
    assert r.status_code == 200, r.text
    assert r.json()["count"] >= 1
    assert db.query(StudentSuccessScore).filter(StudentSuccessScore.student_id == s.id).count() == 1


def test_import_attendance_then_score(client, db):
    admin, _ = make_student(db, "ADM2", role="Admin")
    _, s = make_student(db, "CS001", sgpa=7.0)

    csv_text = (
        "roll_number,subject_code,subject_name,credits,department,total_classes,attended_classes,period\n"
        f"CS001,CS101,Data Structures,4,CSE,50,45,{PERIOD}\n"
        f"CS999,CS101,Data Structures,4,CSE,50,45,{PERIOD}\n"  # unknown roll → error
    )
    r = client.post(
        "/api/v1/admin/import/attendance",
        headers=auth(admin),
        files={"file": ("att.csv", io.BytesIO(csv_text.encode()), "text/csv")},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success_count"] == 1
    assert any(e["column"] == "roll_number" for e in body["error_log"])
    # attendance record created + score computed for the known student
    assert db.query(AttendanceRecord).filter(AttendanceRecord.student_id == s.id).count() == 1
    assert db.query(StudentSuccessScore).filter(StudentSuccessScore.student_id == s.id).count() == 1


def test_naac_export_reflects_computed_score(client, db):
    admin, _ = make_student(db, "ADM4", role="Admin")
    _, s = make_student(db, "CS777", sgpa=8.0)
    subject = make_subject(db)
    db.add(AttendanceRecord(student_id=s.id, subject_id=subject.id, total_classes=50, attended_classes=45, period=PERIOD))
    db.commit()

    client.post("/api/v1/admin/scores/recompute", headers=auth(admin))
    r = client.get("/api/v1/admin/export/naac", headers=auth(admin))
    assert r.status_code == 200
    # att=90, acad=80, eng=0, place=0 → 59.5 → amber (real engine, not 75/80 baseline)
    assert "amber" in r.text
    assert "59.5" in r.text


def test_import_sgpa_sets_field_and_recomputes(client, db):
    admin, _ = make_student(db, "ADM5", role="Admin")
    _, s = make_student(db, "CS888")  # sgpa None initially
    subject = make_subject(db)
    db.add(AttendanceRecord(student_id=s.id, subject_id=subject.id, total_classes=50, attended_classes=45, period=PERIOD))
    db.commit()

    csv_text = "roll_number,sgpa\nCS888,8.0\nCS000,7.0\nCS888bad,15\n"
    r = client.post(
        "/api/v1/admin/import/sgpa",
        headers=auth(admin),
        files={"file": ("sgpa.csv", io.BytesIO(csv_text.encode()), "text/csv")},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success_count"] == 1
    assert any(e["column"] == "roll_number" for e in body["error_log"])  # CS000 unknown
    db.refresh(s)
    assert s.sgpa == 8.0
    # academic now present → a real (non-insufficient) score was stored
    sc = db.query(StudentSuccessScore).filter(StudentSuccessScore.student_id == s.id).first()
    assert sc is not None and sc.academic_component == 80.0


def test_import_sgpa_rejects_out_of_range(client, db):
    admin, _ = make_student(db, "ADM6", role="Admin")
    _, s = make_student(db, "CS889")
    csv_text = "roll_number,sgpa\nCS889,15\n"
    r = client.post(
        "/api/v1/admin/import/sgpa",
        headers=auth(admin),
        files={"file": ("sgpa.csv", io.BytesIO(csv_text.encode()), "text/csv")},
    )
    assert r.status_code == 200
    assert r.json()["success_count"] == 0
    assert any("range" in e["reason"].lower() for e in r.json()["error_log"])


def test_import_rejects_non_utf8(client, db):
    admin, _ = make_student(db, "ADM3", role="Admin")
    bad = b"roll_number,subject_code,total_classes,attended_classes,period\n\xff\xfeCS001,CS1,50,45,2025-ODD\n"
    r = client.post(
        "/api/v1/admin/import/attendance",
        headers=auth(admin),
        files={"file": ("bad.csv", io.BytesIO(bad), "text/csv")},
    )
    assert r.status_code == 200
    assert r.json()["error_log"][0]["reason"].startswith("Encoding error")
