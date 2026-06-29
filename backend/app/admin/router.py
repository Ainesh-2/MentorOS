import csv
import io
from datetime import datetime, timezone
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.audit import write_audit
from backend.app.auth.router import get_current_user, require_role
from backend.app.models.user import User
from backend.app.models.student import Student
from backend.app.models.meeting import Meeting
from backend.app.models.audit import AuditLog
from backend.app.models.academic import (
    AttendanceRecord,
    LmsActivityRecord,
    StudentSuccessScore,
)
from backend.app.admin import schemas
from backend.app.scoring.engine import ScoringEngine, recompute_and_store

router = APIRouter()


def _latest_scores(db: Session, student_ids: list[int]) -> dict:
    """Map student_id → most recent StudentSuccessScore (one query, newest wins)."""
    if not student_ids:
        return {}
    rows = (
        db.query(StudentSuccessScore)
        .filter(StudentSuccessScore.student_id.in_(student_ids))
        .order_by(StudentSuccessScore.computed_at.desc())
        .all()
    )
    latest: dict = {}
    for r in rows:
        latest.setdefault(r.student_id, r)
    return latest


def _fmt_component(value, consented: bool):
    """Format a consent-gated component cell for the export."""
    if not consented:
        return "Consent not given"
    return round(value, 1) if value is not None else "N/A"


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
    write_audit(
        db,
        current_user.id,
        f"user_{action_in.action}",
        "user",
        action_in.user_id,
        details={"target_role": action_in.target_role},
    )
    return {"message": f"Successfully performed action '{action_in.action}' on User ID {action_in.user_id}"}


def _consent_map(student: Student) -> dict:
    """Resolve per-category consent, falling back to the legacy flag."""
    explicit = {c.category.value: c.consented for c in student.consents}
    resolved = {}
    for cat in ("academic", "attendance", "placement"):
        resolved[cat] = explicit.get(cat, bool(student.consent_given))
    return resolved


@router.get("/export/naac")
def export_naac(
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "HOD")),
) -> Any:
    """
    Generate a NAAC/NBA-ready CSV (one row per student). Components a student
    has declined consent for are emitted as "Consent not given" rather than
    the value. Optional `department` filter.
    """
    query = db.query(Student)
    if department:
        query = query.filter(Student.department == department)
    students = query.all()
    latest = _latest_scores(db, [s.id for s in students])

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "USN", "Student Name", "Department", "Mentor", "Total Meetings",
        "Success Score", "Risk Band", "Attendance Component", "Academic Component",
        "Engagement Component", "Placement Component",
        "Consent: Academic", "Consent: Attendance", "Consent: Placement",
        "Consent Categories Enabled",
    ])

    for s in students:
        consents = _consent_map(s)
        sc = latest.get(s.id)
        meetings = (
            db.query(func.count(Meeting.id))
            .filter(Meeting.student_id == s.id, Meeting.status == "Completed")
            .scalar()
        )
        mentor_name = s.mentor.user.full_name if s.mentor and s.mentor.user else "Unassigned"

        total = sc.total_score if sc else None
        risk = sc.risk_category if sc else "insufficient_data"

        writer.writerow([
            s.usn,
            s.user.full_name if s.user else "",
            s.department,
            mentor_name,
            meetings,
            round(total, 1) if total is not None else "insufficient_data",
            risk,
            _fmt_component(sc.attendance_component if sc else None, consents["attendance"]),
            _fmt_component(sc.academic_component if sc else None, consents["academic"]),
            round(sc.engagement_component, 1) if sc and sc.engagement_component is not None else "N/A",
            _fmt_component(sc.placement_component if sc else None, consents["placement"]),
            "Yes" if consents["academic"] else "No",
            "Yes" if consents["attendance"] else "No",
            "Yes" if consents["placement"] else "No",
            ",".join(cat for cat in ("academic", "attendance", "placement") if consents[cat]),
        ])

    write_audit(db, current_user.id, "naac_export", "system", None,
                details={"department": department})

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=mentoros_naac_export.csv"},
    )


@router.post("/scores/recompute", status_code=status.HTTP_200_OK)
def recompute_scores(
    period: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin")),
) -> Any:
    """
    Recompute real Success Scores (Phase 3, SGPA variant) for all students and
    persist a history row + mirror to the students table. Enqueues the Celery
    nightly task when a broker is reachable; otherwise runs synchronously so
    the action still completes in dev.
    """
    period = period or settings.SCORING_PERIOD

    # Try to enqueue via Celery; fall back to synchronous on any failure
    # (celery not installed, or broker unreachable).
    try:
        from backend.app.scoring.tasks import compute_all_scores
        if compute_all_scores is not None and hasattr(compute_all_scores, "delay"):
            task = compute_all_scores.delay(period)
            if settings.CELERY_TASK_ALWAYS_EAGER:
                try:
                    count = task.get(timeout=30)
                except Exception:
                    count = recompute_and_store(db, period)
                write_audit(db, current_user.id, "score_recompute", "system", None,
                            details={"period": period, "students": count, "mode": "sync"})
                return {"message": f"Recomputed scores for {count} students.", "count": count, "period": period}

            if getattr(task, "result", None) is not None:
                count = task.result
                write_audit(db, current_user.id, "score_recompute", "system", None,
                            details={"period": period, "students": count, "mode": "sync"})
                return {"message": f"Recomputed scores for {count} students.", "count": count, "period": period}

            write_audit(db, current_user.id, "score_recompute", "system", None,
                        details={"period": period, "mode": "queued"})
            return {"message": "Score recomputation queued", "task_id": task.id, "period": period}
    except Exception:
        pass  # broker down / celery missing → run inline below

    count = recompute_and_store(db, period)
    write_audit(db, current_user.id, "score_recompute", "system", None,
                details={"period": period, "students": count, "mode": "sync"})
    return {"message": f"Recomputed scores for {count} students.", "count": count, "period": period}


@router.get("/export/audit-log")
def export_audit_log(
    limit: int = 5000,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin")),
) -> Any:
    """
    Export the audit trail as CSV (Admin only) for accreditation / DPDP
    accountability. Newest first.
    """
    entries = (
        db.query(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Timestamp", "User ID", "Action", "Entity Type", "Entity ID",
        "IP Address", "Details",
    ])
    for e in entries:
        writer.writerow([
            e.timestamp.isoformat() if e.timestamp else "",
            e.user_id if e.user_id is not None else "",
            e.action,
            e.entity_type or "",
            e.entity_id or "",
            e.ip_address or "",
            e.details if e.details is not None else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=mentoros_audit_log.csv"},
    )


# ---- CSV imports that feed the scoring engine ----------------------------

def _read_csv(file: UploadFile) -> tuple[list[dict], Optional[str]]:
    """Return (rows, error). error is set for an unreadable / wrong-encoding file."""
    raw = file.file.read()
    text = raw.decode("utf-8", errors="replace")
    if "�" in text:
        return [], "Encoding error detected, expected UTF-8"
    reader = csv.DictReader(io.StringIO(text))
    return list(reader), None


def _load_students_by_roll(db: Session, rolls: set[str]) -> dict:
    """Batch-load students keyed by USN (one query instead of per-row lookups)."""
    if not rolls:
        return {}
    found = db.query(Student).filter(Student.usn.in_(rolls)).all()
    return {s.usn: s for s in found}


def _recompute_affected(db: Session, affected: set[tuple[int, str]]) -> None:
    """Recompute + store scores for the (student, period) pairs that changed."""
    engine = ScoringEngine(db)
    for student_id, period in affected:
        engine.store_score(student_id, period)


@router.post("/import/attendance")
def import_attendance(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "HOD")),
) -> Any:
    """
    Import per-subject attendance and recompute affected students.
    CSV columns: roll_number, subject_code, subject_name, total_classes,
    attended_classes, period.
    """
    rows, err = _read_csv(file)
    if err:
        return {"row_count": 0, "success_count": 0, "error_log": [{"row": 0, "column": "file", "reason": err}]}

    students = _load_students_by_roll(
        db, {(r.get("roll_number") or "").strip() for r in rows if (r.get("roll_number") or "").strip()}
    )
    errors: list[dict] = []
    affected: set[tuple[int, str]] = set()
    success = 0

    for i, row in enumerate(rows, start=2):  # +1 header, 1-based
        roll = (row.get("roll_number") or "").strip()
        student = students.get(roll)
        if not student:
            errors.append({"row": i, "column": "roll_number", "reason": f"Not found: {roll or '(blank)'}"})
            continue
        try:
            total = int(row["total_classes"])
            attended = int(row["attended_classes"])
        except (KeyError, ValueError, TypeError):
            errors.append({"row": i, "column": "total_classes/attended_classes", "reason": "Expected integers"})
            continue
        if attended > total:
            errors.append({"row": i, "column": "attended_classes", "reason": "attended > total"})
            continue

        period = (row.get("period") or settings.SCORING_PERIOD).strip()
        subject = (row.get("subject_code") or "").strip()
        existing = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.student_id == student.id,
                AttendanceRecord.subject_code == subject,
                AttendanceRecord.period == period,
            )
            .first()
        )
        if existing:
            existing.total_classes = total
            existing.attended_classes = attended
            existing.subject_name = row.get("subject_name")
        else:
            db.add(AttendanceRecord(
                student_id=student.id, subject_code=subject,
                subject_name=row.get("subject_name"), total_classes=total,
                attended_classes=attended, period=period,
            ))
        affected.add((student.id, period))
        success += 1

    db.commit()
    _recompute_affected(db, affected)

    write_audit(db, current_user.id, "import_attendance", "system", None,
                details={"rows": len(rows), "success": success, "errors": len(errors)})
    return {"row_count": len(rows), "success_count": success, "error_log": errors}


@router.post("/import/lms")
def import_lms(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "HOD")),
) -> Any:
    """
    Import LMS activity and recompute affected students.
    CSV columns: roll_number, period, login_count, assignments_submitted,
    assignments_total.
    """
    rows, err = _read_csv(file)
    if err:
        return {"row_count": 0, "success_count": 0, "error_log": [{"row": 0, "column": "file", "reason": err}]}

    students = _load_students_by_roll(
        db, {(r.get("roll_number") or "").strip() for r in rows if (r.get("roll_number") or "").strip()}
    )
    errors: list[dict] = []
    affected: set[tuple[int, str]] = set()
    success = 0

    for i, row in enumerate(rows, start=2):
        roll = (row.get("roll_number") or "").strip()
        student = students.get(roll)
        if not student:
            errors.append({"row": i, "column": "roll_number", "reason": f"Not found: {roll or '(blank)'}"})
            continue
        try:
            logins = int(row.get("login_count", 0) or 0)
            submitted = int(row.get("assignments_submitted", 0) or 0)
            total = int(row.get("assignments_total", 0) or 0)
        except (ValueError, TypeError):
            errors.append({"row": i, "column": "login_count/assignments", "reason": "Expected integers"})
            continue

        period = (row.get("period") or settings.SCORING_PERIOD).strip()
        existing = (
            db.query(LmsActivityRecord)
            .filter(
                LmsActivityRecord.student_id == student.id,
                LmsActivityRecord.period == period,
            )
            .first()
        )
        if existing:
            existing.login_count = logins
            existing.assignments_submitted = submitted
            existing.assignments_total = total
        else:
            db.add(LmsActivityRecord(
                student_id=student.id, period=period, login_count=logins,
                assignments_submitted=submitted, assignments_total=total,
            ))
        affected.add((student.id, period))
        success += 1

    db.commit()
    _recompute_affected(db, affected)

    write_audit(db, current_user.id, "import_lms", "system", None,
                details={"rows": len(rows), "success": success, "errors": len(errors)})
    return {"row_count": len(rows), "success_count": success, "error_log": errors}


@router.post("/import/sgpa")
def import_sgpa(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "HOD")),
) -> Any:
    """
    Import this-semester SGPA (drives the Academic component) and recompute.
    CSV columns: roll_number, sgpa.
    """
    rows, err = _read_csv(file)
    if err:
        return {"row_count": 0, "success_count": 0, "error_log": [{"row": 0, "column": "file", "reason": err}]}

    students = _load_students_by_roll(
        db, {(r.get("roll_number") or "").strip() for r in rows if (r.get("roll_number") or "").strip()}
    )
    errors: list[dict] = []
    affected: set[tuple[int, str]] = set()
    success = 0

    for i, row in enumerate(rows, start=2):
        roll = (row.get("roll_number") or "").strip()
        student = students.get(roll)
        if not student:
            errors.append({"row": i, "column": "roll_number", "reason": f"Not found: {roll or '(blank)'}"})
            continue
        try:
            sgpa = float(row["sgpa"])
        except (KeyError, ValueError, TypeError):
            errors.append({"row": i, "column": "sgpa", "reason": "Expected a number"})
            continue
        if not (0.0 <= sgpa <= 10.0):
            errors.append({"row": i, "column": "sgpa", "reason": f"Out of range (0–10), got '{row.get('sgpa')}'"})
            continue

        student.sgpa = sgpa
        # SGPA isn't period-scoped — recompute the current scoring period.
        affected.add((student.id, settings.SCORING_PERIOD))
        success += 1

    db.commit()
    _recompute_affected(db, affected)

    write_audit(db, current_user.id, "import_sgpa", "system", None,
                details={"rows": len(rows), "success": success, "errors": len(errors)})
    return {"row_count": len(rows), "success_count": success, "error_log": errors}
