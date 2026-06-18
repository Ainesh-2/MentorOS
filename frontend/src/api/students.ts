import type { ConsentSettings, Meeting, ScoreBreakdown, Student } from "@/types";
import { DB } from "@/mock/data";
import { clone, respond } from "./client";

/** GET /students/:id */
export function getStudent(id: string): Promise<Student | undefined> {
  return respond(() => clone(DB.students.find((s) => s.id === id)));
}

/** GET /students/:id/score → the backend hand-off contract shape. */
export function getStudentScore(id: string): Promise<ScoreBreakdown | undefined> {
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
