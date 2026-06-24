# API Contracts — MentorOS

This document specifies the exact JSON payloads and REST routes for cross-team integration between the React frontend and FastAPI backend.

---

## 1. Authentication (`/api/v1/auth`)

### Login
- **Endpoint**: `/api/v1/auth/login` (POST)
- **Request Body**: `multipart/form-data`
  - `username` (email)
  - `password`
- **Response (Success - HTTP 200)**:
  ```json
  {
    "access_token": "eyJhbG...",
    "token_type": "bearer"
  }
  ```

### Get Current User
- **Endpoint**: `/api/v1/auth/me` (GET)
- **Headers**: `Authorization: Bearer <token>`
- **Response (Success - HTTP 200)**:
  ```json
  {
    "id": 12,
    "email": "faculty.mentor@college.edu",
    "full_name": "Dr. Sarah Jenkins",
    "role": "Mentor",
    "is_active": true
  }
  ```

### Password Reset Request
- **Endpoint**: `/api/v1/auth/password-reset/request` (POST)
- **Request Body**:
  ```json
  {
    "email": "student@college.edu"
  }
  ```
- **Response (Success - HTTP 200)**:
  ```json
  {
    "message": "Password reset email sent (Mock). Use token 'mock-token' to verify."
  }
  ```

### Password Reset Confirm
- **Endpoint**: `/api/v1/auth/password-reset/confirm` (POST)
- **Request Body**:
  ```json
  {
    "token": "mock-token",
    "new_password": "NewSecretPassword123"
  }
  ```
- **Response (Success - HTTP 200)**:
  ```json
  {
    "message": "Password has been reset successfully."
  }
  ```

---

## 2. Students & Profiles (`/api/v1/students`)

### Get Students List (Mentors, HODs, Admins)
- **Endpoint**: `/api/v1/students/` (GET)
- **Response (Success - HTTP 200)**:
  ```json
  [
    {
      "id": 1,
      "user_id": 4,
      "usn": "1MS22CS001",
      "department": "CSE",
      "semester": 6,
      "attendance_rate": 88.5,
      "cgpa": 8.4,
      "success_score": 84.0,
      "risk_status": "Green",
      "consent_given": true
    }
  ]
  ```

### Get Student Profile (Self)
- **Endpoint**: `/api/v1/students/me` (GET)
- **Response (Success - HTTP 200)**:
  ```json
  {
    "id": 1,
    "user_id": 4,
    "usn": "1MS22CS001",
    "department": "CSE",
    "semester": 6,
    "attendance_rate": 88.5,
    "cgpa": 8.4,
    "success_score": 84.0,
    "risk_status": "Green",
    "consent_given": true
  }
  ```

### Update Student Privacy Consent (legacy master toggle)
- **Endpoint**: `/api/v1/students/me/consent` (PUT)
- **Notes**: Sets the legacy `consent_given` flag **and** syncs the per-category
  rows (academic/attendance/placement) to the same value so both stay
  consistent. Under-18 students get `403` (DPDP). Prefer the per-category
  `PATCH /students/{id}/consent` for granular control.
- **Request Body**:
  ```json
  {
    "consent_given": false
  }
  ```
- **Response (Success - HTTP 200)**:
  ```json
  {
    "id": 1,
    "user_id": 4,
    "usn": "1MS22CS001",
    "department": "CSE",
    "semester": 6,
    "attendance_rate": 88.5,
    "cgpa": 8.4,
    "success_score": 84.0,
    "risk_status": "Green",
    "consent_given": false
  }
  ```

---

## 3. Success Score Calculations (`/api/v1/scoring`)

### Fetch Single Score Breakdown
- **Endpoint**: `/api/v1/scoring/{student_id}` (GET)
- **Notes**: Real Phase-3 (SGPA) computation from source tables. **Read-only** —
  does not persist. Matches the frontend `ScoreBreakdown` contract: flat
  `*_component` fields, `total_score`, `risk_category`. Components and
  `total_score` are `null` when source data is missing; if attendance or
  academic is missing, `risk_category` is `"insufficient_data"`.
- **Response (Success - HTTP 200)**:
  ```json
  {
    "student_id": 1,
    "usn": "1MS22CS001",
    "period": "2025-ODD",
    "attendance_component": 88.5,
    "academic_component": 84.0,
    "engagement_component": 79.0,
    "placement_component": 72.0,
    "total_score": 82.6,
    "risk_category": "green"
  }
  ```
- **Insufficient data**: `total_score: null`, `risk_category: "insufficient_data"`.

### Batch Recalculate Scores (HOD / Admin)
- **Endpoint**: `/api/v1/scoring/batch-recalculate` (POST)
- **Response (Success - HTTP 200)**:
  ```json
  {
    "message": "Successfully ran batch job. Recalculated scores for 42 students."
  }
  ```

---

## 4. Mentoring & Roster Actions (`/api/v1/mentoring`)

### Fetch Assigned Roster (Mentor Only)
- **Endpoint**: `/api/v1/mentoring/roster` (GET)
- **Response (Success - HTTP 200)**:
  ```json
  [
    {
      "id": 1,
      "user_id": 4,
      "usn": "1MS22CS001",
      "department": "CSE",
      "semester": 6,
      "attendance_rate": 88.5,
      "cgpa": 8.4,
      "success_score": 84.0,
      "risk_status": "Green",
      "consent_given": true
    }
  ]
  ```

### Schedule Meeting (Mentor Only)
- **Endpoint**: `/api/v1/mentoring/meetings` (POST)
- **Request Body**:
  ```json
  {
    "student_id": 1,
    "title": "Mid-term academic follow-up",
    "date": "2026-06-25T10:00:00Z",
    "mode": "video",
    "notes": "Discuss math grade and class attendance rate improvement."
  }
  ```
  - `mode`: `"in-person"` (default), `"video"`, or `"phone"`.
- **Response (Success - HTTP 200)**:
  ```json
  {
    "id": 15,
    "mentor_id": 2,
    "student_id": 1,
    "title": "Mid-term academic follow-up",
    "date": "2026-06-25T10:00:00Z",
    "mode": "video",
    "notes": "Discuss math grade and class attendance rate improvement.",
    "status": "Scheduled"
  }
  ```

### Allocate Student (HOD / Admin Only)
- **Endpoint**: `/api/v1/mentoring/allocate` (POST)
- **Request Body**:
  ```json
  {
    "student_id": 1,
    "mentor_id": 2
  }
  ```
- **Response (Success - HTTP 200)**:
  ```json
  {
    "message": "Successfully allocated Student 1MS22CS001 to Mentor Dr. Sarah Jenkins"
  }
  ```

---

## 5. Structured Meeting Logs (`/api/v1/mentoring`)

### Log a Completed Meeting (Mentor / Admin)
- **Endpoint**: `/api/v1/mentoring/meetings/{meeting_id}/log` (POST)
- **Notes**: Mentors may only log their own meetings (else `403`). Re-logging a
  meeting returns `409`. Marks the meeting `Completed` and writes an audit row.
- **Request Body**:
  ```json
  {
    "topics_discussed": ["attendance", "exam_prep", "career"],
    "action_items": ["attend next 5 classes", "meet subject teacher"],
    "next_meeting_date": "2026-07-04",
    "observations": "Student seems stressed about backlogs"
  }
  ```
- **Response (Success - HTTP 201)**:
  ```json
  { "message": "Meeting logged", "log_id": 9 }
  ```

### Get a Student's Meetings + Logs
- **Endpoint**: `/api/v1/mentoring/students/{student_id}/meetings` (GET)
- **Notes**: Students may only view their own (else `403`). Newest first.
- **Response (Success - HTTP 200)**:
  ```json
  [
    {
      "id": 15,
      "title": "Mid-term academic follow-up",
      "date": "2026-06-25T10:00:00",
      "status": "Completed",
      "log": {
        "topics_discussed": ["attendance"],
        "action_items": ["attend next 5 classes"],
        "next_meeting_date": "2026-07-04",
        "observations": "Stressed about backlogs",
        "logged_at": "2026-06-25T11:02:00"
      }
    }
  ]
  ```

---

## 6. Per-Category Consent (`/api/v1/students`)

> Supersedes the single `consent_given` boolean (which is retained). DPDP:
> under-18 students cannot self-update (`403`); `wellness` is locked (`403`).

### Get Consents (Self / staff)
- **Endpoint**: `/api/v1/students/{student_id}/consents` (GET)
- **Response (Success - HTTP 200)**:
  ```json
  {
    "is_under_18": false,
    "academic":   { "consented": true,  "notice_version": "1.0", "consented_at": "2026-06-24T09:00:00", "locked": false },
    "attendance": { "consented": false, "notice_version": "1.0", "consented_at": "2026-06-24T09:05:00", "locked": false },
    "placement":  { "consented": true,  "notice_version": "1.0", "consented_at": null, "locked": false },
    "wellness":   { "consented": false, "notice_version": "1.0", "consented_at": null, "locked": true }
  }
  ```

### Update a Consent Category (Self)
- **Endpoint**: `/api/v1/students/{student_id}/consent` (PATCH)
- **Request Body**:
  ```json
  { "category": "attendance", "consented": false }
  ```
- **Response (Success - HTTP 200)**:
  ```json
  { "message": "Consent updated", "category": "attendance", "consented": false }
  ```
- **Errors**: `403` for `wellness`, for under-18, or for another student's record.

---

## 7. Administration (`/api/v1/admin`)

### NAAC / NBA Export (Admin / HOD)
- **Endpoint**: `/api/v1/admin/export/naac` (GET)
- **Query**: `department` (optional)
- **Notes**: Streams `text/csv` (one row per student). Component values come from
  each student's **latest computed score** (`student_success_scores`); run
  `/admin/scores/recompute` (or wait for the nightly job) to refresh. Components
  the student has declined consent for are emitted as `"Consent not given"`;
  un-scored students show `insufficient_data` / `N/A`. Includes a
  `Consent Categories Enabled` column (comma list). Audited.
- **Response**: `200` `Content-Type: text/csv`, attachment `mentoros_naac_export.csv`.

### Audit Log Export (Admin)
- **Endpoint**: `/api/v1/admin/export/audit-log` (GET)
- **Query**: `limit` (default 5000)
- **Notes**: Streams `text/csv` (newest first) for DPDP accountability /
  accreditation. Columns: timestamp, user id, action, entity type, entity id,
  IP address, details.
- **Response**: `200` `Content-Type: text/csv`, attachment `mentoros_audit_log.csv`.

### Recompute All Scores (Admin)
- **Endpoint**: `/api/v1/admin/scores/recompute` (POST)
- **Query**: `period` (optional, default from `SCORING_PERIOD`, e.g. `2025-ODD`)
- **Notes**: Computes the real Phase-3 score (SGPA variant) for every student,
  writes a `student_success_scores` history row, and mirrors the latest to the
  `students` table. Enqueues the Celery nightly task when a broker is reachable;
  otherwise runs synchronously. Audited.
- **Response (queued)**: `{ "message": "Score recomputation queued", "task_id": "...", "period": "2025-ODD" }`
- **Response (synchronous)**: `{ "message": "Recomputed scores for 42 students.", "count": 42, "period": "2025-ODD" }`

### Import CSV → scoring source tables (Admin / HOD)
- **Endpoints** (POST, multipart `file`):
  - `/api/v1/admin/import/attendance` — `roll_number, subject_code, subject_name, total_classes, attended_classes, period`
  - `/api/v1/admin/import/sgpa` — `roll_number, sgpa` (drives the Academic component; SGPA 0–10)
  - `/api/v1/admin/import/lms` — `roll_number, period, login_count, assignments_submitted, assignments_total`
- **Notes**: Upserts into the scoring source tables and recomputes affected
  students. Non-UTF-8 files and bad rows are reported, not fatal. Audited.
- **Response (Success - HTTP 200)**:
  ```json
  {
    "row_count": 848,
    "success_count": 845,
    "error_log": [
      { "row": 14, "column": "attended_classes", "reason": "attended > total" },
      { "row": 22, "column": "roll_number", "reason": "Not found: CS999" }
    ]
  }
  ```

> **Scoring engine (Phase 3, SGPA variant).** `Total = 0.35·Attendance +
> 0.35·Academic + 0.15·Engagement + 0.15·Placement`. Academic = `min(SGPA×10, 100)`.
> If attendance **or** academic has no source data → `total_score = null`,
> `risk_category = "insufficient_data"`. Placement with no profile = `0`.
> `risk_category` is lowercase (`green`/`amber`/`coral`/`insufficient_data`);
> `students.risk_status` mirrors it capitalised for backward compatibility.
