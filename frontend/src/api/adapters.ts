/**
 * Backend → frontend DTO adapters.
 *
 * The FastAPI responses and the frontend domain types (src/types) deliberately
 * use different names/casing in places. Rather than leak backend field names
 * into components, every real `fetch` should pass responses through these
 * adapters. This is the single place that knows the wire shape.
 *
 * Mismatches handled here:
 *   meeting:  date → scheduled_for, topics_discussed → topics,
 *             observations → summary, action_items (string[]) → ActionItem[],
 *             status "Scheduled"/… → "scheduled"/… , mode constrained.
 *   role:     "Student"/"Mentor"/"HOD"/"Admin" → "student"/"mentor"/"hod"/"admin".
 */
import type {
  ActionItem,
  Meeting,
  MeetingLog,
  MeetingStatus,
  Role,
} from "@/types";

// ---- wire shapes (what the backend actually returns) ---------------------

export interface BackendMeetingLog {
  topics_discussed: string[];
  action_items: string[];
  next_meeting_date: string | null;
  observations: string | null;
  logged_at: string | null;
}

export interface BackendMeeting {
  id: number;
  student_id?: number;
  mentor_id?: number;
  title: string;
  date: string | null;
  mode: string;
  status: string;
  log: BackendMeetingLog | null;
}

export type BackendRole = "Student" | "Mentor" | "HOD" | "Admin";

// ---- maps ----------------------------------------------------------------

const STATUS_MAP: Record<string, MeetingStatus> = {
  Scheduled: "scheduled",
  Completed: "completed",
  Cancelled: "cancelled",
};

const ROLE_MAP: Record<BackendRole, Role> = {
  Student: "student",
  Mentor: "mentor",
  HOD: "hod",
  Admin: "admin",
};

const VALID_MODES: Meeting["mode"][] = ["in-person", "video", "phone"];

// ---- adapters ------------------------------------------------------------

/** Capitalised backend role → lowercase frontend role. */
export function toRole(role: string): Role {
  return ROLE_MAP[role as BackendRole] ?? (role.toLowerCase() as Role);
}

function toActionItems(items: string[]): ActionItem[] {
  return (items ?? []).map((text, i) => ({
    id: `ai-${i}`,
    text,
    owner: "student",
    done: false,
  }));
}

export function toMeetingLog(log: BackendMeetingLog): MeetingLog {
  return {
    topics: log.topics_discussed ?? [],
    summary: log.observations ?? "",
    action_items: toActionItems(log.action_items),
    next_meeting_date: log.next_meeting_date ?? undefined,
    logged_at: log.logged_at ?? "",
  };
}

export function toMeeting(m: BackendMeeting): Meeting {
  const mode = (VALID_MODES as string[]).includes(m.mode)
    ? (m.mode as Meeting["mode"])
    : "in-person";
  return {
    id: String(m.id),
    student_id: m.student_id != null ? String(m.student_id) : "",
    mentor_id: m.mentor_id != null ? String(m.mentor_id) : "",
    scheduled_for: m.date ?? "",
    status: STATUS_MAP[m.status] ?? "scheduled",
    mode,
    log: m.log ? toMeetingLog(m.log) : undefined,
  };
}
