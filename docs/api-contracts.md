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

### Update Student Privacy Consent
- **Endpoint**: `/api/v1/students/me/consent` (PUT)
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
- **Response (Success - HTTP 200)**:
  ```json
  {
    "student_id": 1,
    "usn": "1MS22CS001",
    "overall_score": 84.0,
    "risk_band": "Green",
    "components": {
      "attendance_score": 88.5,
      "academic_score": 84.0,
      "engagement_score": 75.0,
      "placement_score": 80.0
    }
  }
  ```

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
    "notes": "Discuss math grade and class attendance rate improvement."
  }
  ```
- **Response (Success - HTTP 200)**:
  ```json
  {
    "id": 15,
    "mentor_id": 2,
    "student_id": 1,
    "title": "Mid-term academic follow-up",
    "date": "2026-06-25T10:00:00Z",
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
