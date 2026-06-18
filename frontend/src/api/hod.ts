import type {
  DepartmentOverview,
  MentorLoad,
  RiskCategory,
  ScorePoint,
  SemesterRisk,
} from "@/types";
import { DB } from "@/mock/data";
import { round } from "@/lib/utils";
import { clone, respond } from "./client";

function emptyRiskCounts(): Record<RiskCategory, number> {
  return { green: 0, amber: 0, coral: 0 };
}

function monthStart(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

/** GET /departments/:id/overview — everything the HOD dashboard renders. */
export function getDepartmentOverview(): Promise<DepartmentOverview> {
  return respond<DepartmentOverview>(() => {
    const students = DB.students;
    const risk_counts = emptyRiskCounts();
    let scoreSum = 0;
    for (const s of students) {
      risk_counts[s.score.risk_category]++;
      scoreSum += s.score.total_score;
    }

    const mentor_loads: MentorLoad[] = DB.mentors.map((mentor) => {
      const mentees = students.filter((s) => s.mentor_id === mentor.id);
      const counts = emptyRiskCounts();
      let sum = 0;
      for (const s of mentees) {
        counts[s.score.risk_category]++;
        sum += s.score.total_score;
      }
      const meetings_this_month = DB.meetings.filter(
        (m) => m.mentor_id === mentor.id && monthStart(m.scheduled_for),
      ).length;
      return {
        mentor: clone(mentor),
        mentee_count: mentees.length,
        risk_counts: counts,
        avg_score: mentees.length ? round(sum / mentees.length, 1) : 0,
        meetings_this_month,
      };
    });

    const semesters = [...new Set(students.map((s) => s.semester))].sort((a, b) => a - b);
    const semester_risk: SemesterRisk[] = semesters.map((semester) => {
      const inSem = students.filter((s) => s.semester === semester);
      const counts = emptyRiskCounts();
      for (const s of inSem) counts[s.score.risk_category]++;
      return { semester, ...counts };
    });

    // Department trend = mean of every student's history at each term index.
    const termCount = students[0]?.score_history.length ?? 0;
    const trend: ScorePoint[] = Array.from({ length: termCount }, (_, i) => {
      const label = students[0].score_history[i].label;
      const mean =
        students.reduce((sum, s) => sum + s.score_history[i].total_score, 0) /
        students.length;
      return { label, total_score: round(mean, 1) };
    });

    return {
      department: clone(DB.department),
      total_students: students.length,
      risk_counts,
      avg_score: round(scoreSum / students.length, 1),
      mentor_loads,
      semester_risk,
      trend,
    };
  });
}
