# Product Requirements Document (PRD) — MentorOS

## 1. Executive Summary
MentorOS is an early-risk detection platform designed to streamline student mentoring. It integrates attendance, academics (grades), engagement, and placement metrics into a unified Student Success Score. This dashboard empowers HODs, Mentors, Admins, and Students to proactively identify risk bands and coordinate interventions.

---

## 2. User Roles & Personas
- **Student**: Monitors their own score, checks meeting histories, controls data-sharing consent, and interacts with the AI Companion.
- **Mentor**: Tracks an assigned student roster, schedules mentoring sessions, and records session summaries.
- **HOD (Head of Department)**: Evaluates department risk heatmaps, monitors mentor workloads, and reviews trends over semesters.
- **Admin**: Manages user accounts, imports CSV student rosters, and exports compliance data for NAAC/NBA accreditation audits.

---

## 3. Product Features & Scope
- **Explainable Student Success Score**: Weights include Attendance (35%), Academics (35%), Engagement (15%), and Placement (15%). Risk statuses are flagged dynamically (Green, Amber, Coral).
- **Roster & Meeting Logs**: Facilitates scheduled meetings, meeting completion, and logging of notes.
- **CSV Data Import**: Supports CSV parsing for administrative student roster updates.
- **Accreditation Export**: Extracts academic performance indicators grouped by risk and mentoring metrics.
- **AI Companion**: A chatbot helper suggesting academic steps and fetching real-time score statistics.
