import type { ConsentSettings, Meeting, Student } from "@/types";
import { DB } from "@/mock/data";
import { clone, respond } from "./client";

const API_BASE = "/api/v1";

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : {};
}

/** GET /students/me — real backend, authenticated */
export async function getMyStudentProfile(): Promise<Student | null> {
  const token = sessionStorage.getItem("token");
  if (!token) return null;

  const resp = await fetch(`${API_BASE}/students/me`, { headers: authHeaders() });
  if (!resp.ok) return null;

  const data = await resp.json();
  // Adapt backend shape → frontend Student type
  return {
    id: String(data.id),
    name: data.user?.full_name ?? "Student",
    roll_no: data.usn,
    email: data.user?.email ?? "",
    department_id: data.department,
    mentor_id: data.mentor_id ? String(data.mentor_id) : "",
    semester: data.semester,
    avatar_hue: 214,
    signals: {
      attendance_pct: data.attendance_rate ?? 0,
      subjects: [],
      active_backlogs: 0,
      logins_30d: 0,
      assignment_submission_rate: 1,
      placement_profile: {
        resume_uploaded: false,
        skills_listed: false,
        certifications_added: false,
      },
    },
    score: {
      attendance_component: data.attendance_rate ?? 0,
      academic_component: data.cgpa ? (data.cgpa / 10) * 100 : 0,
      engagement_component: 0,
      placement_component: 0,
      total_score: data.success_score ?? 0,
      risk_category:
        data.risk_status === "Green"
          ? "green"
          : data.risk_status === "Amber"
            ? "amber"
            : "coral",
    },
    score_history: [],
    consents: {
      academic: true,
      attendance: data.consent_given ?? true,
      placement: true,
      wellness: false,
    },
  };
}

/** GET /students/:id — mock fallback */
export function getStudent(id: string): Promise<Student | undefined> {
  return respond(() => clone(DB.students.find((s) => s.id === id)));
}

/** GET /students/:id/score → the backend hand-off contract shape. */
export function getStudentScore(id: string): Promise<{ total_score: number } | undefined> {
  return respond(() => {
    const s = DB.students.find((st) => st.id === id);
    return s ? clone(s.score) : undefined;
  });
}

/** GET /students/:id/meetings — newest first. */
export function getStudentMeetings(id: string): Promise<Meeting[]> {
  return respond(() =>
    clone(
      DB.meetings
        .filter((m) => m.student_id === id)
        .sort(
          (a, b) =>
            new Date(b.scheduled_for).getTime() - new Date(a.scheduled_for).getTime(),
        ),
    ),
  );
}

/** PATCH /students/:id/consents */
export function updateStudentConsents(
  id: string,
  consents: ConsentSettings,
): Promise<ConsentSettings> {
  return respond(() => {
    const s = DB.students.find((st) => st.id === id);
    if (s) s.consents = { ...consents, wellness: false };
    return clone(s ? s.consents : consents);
  }, [120, 260]);
}

