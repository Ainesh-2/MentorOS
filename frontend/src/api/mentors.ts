import type { Meeting, MeetingLog, Mentor, RosterEntry } from "@/types";
import { DB } from "@/mock/data";
import { clone, respond } from "./client";

/** GET /mentors/:id */
export function getMentor(id: string): Promise<Mentor | undefined> {
  return respond(() => clone(DB.mentors.find((m) => m.id === id)));
}

/** GET /mentors — all mentors in the department. */
export function getMentors(): Promise<Mentor[]> {
  return respond(() => clone(DB.mentors));
}

function openActionItems(studentId: string): number {
  return DB.meetings
    .filter((m) => m.student_id === studentId && m.log)
    .reduce((sum, m) => sum + m.log!.action_items.filter((a) => !a.done).length, 0);
}

function lastCompleted(studentId: string): Meeting | undefined {
  return DB.meetings
    .filter((m) => m.student_id === studentId && m.status === "completed")
    .sort((a, b) => new Date(b.scheduled_for).getTime() - new Date(a.scheduled_for).getTime())[0];
}

function nextScheduled(studentId: string): Meeting | undefined {
  const now = Date.now();
  return DB.meetings
    .filter(
      (m) =>
        m.student_id === studentId &&
        m.status === "scheduled" &&
        new Date(m.scheduled_for).getTime() >= now,
    )
    .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())[0];
}

/** GET /mentors/:id/roster — students plus mentoring context per row. */
export function getMentorRoster(mentorId: string): Promise<RosterEntry[]> {
  return respond(() => {
    const rows: RosterEntry[] = DB.students
      .filter((s) => s.mentor_id === mentorId)
      .map((student) => ({
        student: clone(student),
        last_meeting: clone(lastCompleted(student.id)),
        next_meeting: clone(nextScheduled(student.id)),
        open_action_items: openActionItems(student.id),
      }));
    return rows;
  });
}

/** POST /meetings — schedule a new meeting. */
export function scheduleMeeting(input: {
  student_id: string;
  mentor_id: string;
  scheduled_for: string;
  mode: Meeting["mode"];
}): Promise<Meeting> {
  return respond(() => {
    const meeting: Meeting = {
      id: `mtg-${Date.now()}`,
      status: "scheduled",
      ...input,
    };
    DB.meetings.push(meeting);
    return clone(meeting);
  }, [220, 420]);
}

/** POST /meetings/:id/log — close out a scheduled meeting with a structured log. */
export function logMeeting(meetingId: string, log: MeetingLog): Promise<Meeting> {
  return respond(() => {
    const meeting = DB.meetings.find((m) => m.id === meetingId);
    if (meeting) {
      meeting.status = "completed";
      meeting.log = log;
    }
    return clone(meeting!);
  }, [220, 420]);
}

/**
 * POST /meetings — record a meeting that already happened, with its log in one
 * step (used when there's no pre-scheduled slot to close out).
 */
export function recordMeeting(input: {
  student_id: string;
  mentor_id: string;
  scheduled_for: string;
  mode: Meeting["mode"];
  log: MeetingLog;
}): Promise<Meeting> {
  return respond(() => {
    const meeting: Meeting = {
      id: `mtg-${Date.now()}`,
      status: "completed",
      ...input,
    };
    DB.meetings.push(meeting);
    return clone(meeting);
  }, [220, 420]);
}
