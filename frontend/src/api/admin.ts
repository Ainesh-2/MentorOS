import type { PlatformUser, Role } from "@/types";
import { DB } from "@/mock/data";
import { HOD_NAME } from "@/mock/names";
import { RISK_META } from "@/lib/score";
import { clone, respond } from "./client";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/** Built once — admin, HOD, the five mentors, then every student. */
function buildUsers(): PlatformUser[] {
  const users: PlatformUser[] = [
    {
      id: "usr-admin",
      name: "Priya Nair",
      email: "priya.nair@example.edu",
      role: "admin",
      department_code: "—",
      status: "active",
      last_active: isoDaysAgo(0),
    },
    {
      id: "usr-hod",
      name: HOD_NAME,
      email: "vikram.rao@cse.example.edu",
      role: "hod",
      department_code: DB.department.code,
      status: "active",
      last_active: isoDaysAgo(1),
    },
    ...DB.mentors.map<PlatformUser>((m, i) => ({
      id: `usr-${m.id}`,
      name: m.name,
      email: m.email,
      role: "mentor",
      department_code: DB.department.code,
      status: "active",
      last_active: isoDaysAgo(i),
    })),
    ...DB.students.map<PlatformUser>((s, i) => ({
      id: `usr-${s.id}`,
      name: s.name,
      email: s.email,
      role: "student",
      department_code: DB.department.code,
      // A couple of invited/suspended rows for realism.
      status: i % 23 === 7 ? "invited" : i % 31 === 5 ? "suspended" : "active",
      last_active: isoDaysAgo((i * 3) % 40),
    })),
  ];
  return users;
}

const USERS = buildUsers();

/** GET /admin/users */
export function getPlatformUsers(): Promise<PlatformUser[]> {
  return respond(() => clone(USERS));
}

export interface ComplianceExport {
  filename: string;
  generated_at: string;
  row_count: number;
  csv: string;
}

const ROLE_LABEL: Record<Role, string> = {
  student: "Student",
  mentor: "Mentor",
  hod: "HOD",
  admin: "Admin",
};

/**
 * POST /admin/exports/naac — generate the mentoring-compliance dataset that
 * feeds NAAC/NBA reporting. Returns a ready-to-download CSV built entirely
 * from the mock data.
 */
export function generateComplianceExport(): Promise<ComplianceExport> {
  return respond<ComplianceExport>(() => {
    const header = [
      "Roll No",
      "Student",
      "Semester",
      "Mentor",
      "Attendance %",
      "Academic",
      "Engagement",
      "Placement",
      "Success Score",
      "Risk Band",
      "Meetings Logged",
    ];
    const mentorName = (id: string) =>
      DB.mentors.find((m) => m.id === id)?.name ?? "—";

    const rows = DB.students.map((s) => {
      const meetings = DB.meetings.filter(
        (m) => m.student_id === s.id && m.status === "completed",
      ).length;
      return [
        s.roll_no,
        s.name,
        `Sem ${s.semester}`,
        mentorName(s.mentor_id),
        s.score.attendance_component,
        s.score.academic_component,
        s.score.engagement_component,
        s.score.placement_component,
        s.score.total_score,
        RISK_META[s.score.risk_category].label,
        meetings,
      ];
    });

    const escape = (v: string | number) => {
      const str = String(v);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const csv = [header, ...rows]
      .map((r) => r.map(escape).join(","))
      .join("\r\n");

    const now = new Date();
    return {
      filename: `MentorOS_NAAC_${DB.department.code}_${now.getFullYear()}.csv`,
      generated_at: now.toISOString(),
      row_count: rows.length,
      csv,
    };
  }, [600, 1100]);
}

export { ROLE_LABEL };
