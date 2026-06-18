/**
 * Self-contained mock dataset for one department.
 *
 * Everything is generated deterministically from a fixed seed so the demo is
 * stable across reloads. Scores are NOT hardcoded — raw signals are generated
 * with realistic variance, then run through the real formula in `@/lib/score`,
 * which is exactly what a backend would do. Components read this only through
 * the `/src/api` wrapper.
 */
import type {
  ActionItem,
  Department,
  Meeting,
  Mentor,
  ScorePoint,
  Student,
  StudentSignals,
  SubjectMark,
} from "@/types";
import { computeScore, engagementRaw, riskCategory } from "@/lib/score";
import { clamp, round } from "@/lib/utils";
import { FIRST_NAMES, HOD_NAME, LAST_NAMES, MENTOR_NAMES } from "./names";

/* --------------------------- seeded RNG --------------------------- */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* --------------------------- static config --------------------------- */

const SUBJECTS: Array<Omit<SubjectMark, "internal_marks" | "max_internal">> = [
  { code: "CS301", name: "Data Structures" },
  { code: "CS302", name: "Operating Systems" },
  { code: "CS303", name: "Database Systems" },
  { code: "CS304", name: "Computer Networks" },
  { code: "CS305", name: "Theory of Computation" },
  { code: "MA301", name: "Discrete Mathematics" },
];

const MAX_INTERNAL = 40;
const SEMESTERS = [3, 4, 5, 6];
const TERM_LABELS = ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Now"];

type Archetype = "strong" | "steady" | "wobbling" | "struggling";

interface ArchetypeSpec {
  weight: number;
  attendance: [number, number];
  markRatio: [number, number];
  backlogWeights: number[]; // index = backlog count
  logins: [number, number];
  submission: [number, number];
  placement: [number, number, number]; // P(resume), P(skills), P(cert)
}

const ARCHETYPES: Record<Archetype, ArchetypeSpec> = {
  strong: {
    weight: 0.28,
    attendance: [82, 97],
    markRatio: [0.72, 0.95],
    backlogWeights: [0.95, 0.05],
    logins: [30, 46],
    submission: [0.85, 1.0],
    placement: [0.97, 0.92, 0.7],
  },
  steady: {
    weight: 0.3,
    attendance: [70, 86],
    markRatio: [0.58, 0.8],
    backlogWeights: [0.75, 0.25],
    logins: [20, 38],
    submission: [0.6, 0.9],
    placement: [0.82, 0.68, 0.4],
  },
  wobbling: {
    weight: 0.27,
    attendance: [55, 74],
    markRatio: [0.42, 0.66],
    backlogWeights: [0.4, 0.4, 0.2],
    logins: [10, 26],
    submission: [0.35, 0.7],
    placement: [0.5, 0.38, 0.18],
  },
  struggling: {
    weight: 0.15,
    attendance: [36, 62],
    markRatio: [0.28, 0.5],
    backlogWeights: [0, 0.42, 0.4, 0.18],
    logins: [3, 16],
    submission: [0.15, 0.5],
    placement: [0.26, 0.18, 0.07],
  },
};

/* --------------------------- generation --------------------------- */

const DEPARTMENT: Department = {
  id: "dept-cse",
  name: "Computer Science & Engineering",
  code: "CSE",
  hod_name: HOD_NAME,
};

interface Rng {
  (): number;
  range: (min: number, max: number) => number;
  int: (min: number, max: number) => number;
  chance: (p: number) => boolean;
  pick: <T>(arr: T[]) => T;
  weighted: (weights: number[]) => number;
}

function makeRng(seed: number): Rng {
  const base = mulberry32(seed) as Rng;
  base.range = (min, max) => min + base() * (max - min);
  base.int = (min, max) => Math.floor(base.range(min, max + 1));
  base.chance = (p) => base() < p;
  base.pick = (arr) => arr[Math.floor(base() * arr.length)];
  base.weighted = (weights) => {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = base() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  };
  return base;
}

function pickArchetype(rng: Rng): Archetype {
  const keys = Object.keys(ARCHETYPES) as Archetype[];
  const idx = rng.weighted(keys.map((k) => ARCHETYPES[k].weight));
  return keys[idx];
}

function buildSignals(rng: Rng, spec: ArchetypeSpec): StudentSignals {
  const subjects: SubjectMark[] = SUBJECTS.map((s) => {
    const ratio = clamp(rng.range(spec.markRatio[0], spec.markRatio[1]), 0, 1);
    return {
      ...s,
      max_internal: MAX_INTERNAL,
      internal_marks: Math.round(ratio * MAX_INTERNAL),
    };
  });
  return {
    attendance_pct: round(rng.range(spec.attendance[0], spec.attendance[1]), 1),
    subjects,
    active_backlogs: rng.weighted(spec.backlogWeights),
    logins_30d: rng.int(spec.logins[0], spec.logins[1]),
    assignment_submission_rate: round(rng.range(spec.submission[0], spec.submission[1]), 2),
    placement_profile: {
      resume_uploaded: rng.chance(spec.placement[0]),
      skills_listed: rng.chance(spec.placement[1]),
      certifications_added: rng.chance(spec.placement[2]),
    },
  };
}

/** Walk backwards from the current total to fabricate a believable trend. */
function buildHistory(rng: Rng, current: number): ScorePoint[] {
  const points: number[] = [current];
  let v = current;
  for (let i = 0; i < TERM_LABELS.length - 1; i++) {
    // Earlier terms drift away from current with mild mean-reversion to ~62.
    const drift = rng.range(-7, 9) + (62 - v) * 0.12;
    v = clamp(round(v - drift, 1));
    points.unshift(v);
  }
  return points.map((total_score, i) => ({ label: TERM_LABELS[i], total_score }));
}

interface Built {
  department: Department;
  mentors: Mentor[];
  students: Student[];
  meetings: Meeting[];
  demoStudentId: string;
  demoMentorId: string;
}

function build(): Built {
  const rng = makeRng(0x4d454e54); // "MENT"

  const mentors: Mentor[] = MENTOR_NAMES.map((m, i) => ({
    id: `mnt-${i + 1}`,
    name: m.name,
    title: m.title,
    email: `${m.name.split(" ").pop()!.toLowerCase()}@cse.example.edu`,
    department_id: DEPARTMENT.id,
    avatar_hue: 200 + i * 26,
  }));

  // Uneven mentee loads so the HOD workload chart has range.
  const loads = [18, 16, 14, 12, 10]; // = 70
  const mentorByStudent: string[] = [];
  loads.forEach((count, mi) => {
    for (let k = 0; k < count; k++) mentorByStudent.push(mentors[mi].id);
  });

  const usedNames = new Set<string>();
  const makeName = (): string => {
    for (let tries = 0; tries < 40; tries++) {
      const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
      if (!usedNames.has(name)) {
        usedNames.add(name);
        return name;
      }
    }
    return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
  };

  // Pass 1 — raw signals.
  const draft = mentorByStudent.map((mentorId, i) => {
    const archetype = pickArchetype(rng);
    const signals = buildSignals(rng, ARCHETYPES[archetype]);
    const name = makeName();
    const semester = SEMESTERS[rng.weighted([0.22, 0.3, 0.28, 0.2])];
    return { i, mentorId, archetype, signals, name, semester };
  });

  const cohortMeanEngagementRaw =
    draft.reduce((sum, d) => sum + engagementRaw(d.signals), 0) / draft.length;

  // Pass 2 — derive scores + assemble students.
  const students: Student[] = draft.map((d) => {
    const score = computeScore(d.signals, cohortMeanEngagementRaw);
    const id = `stu-${String(d.i + 1).padStart(3, "0")}`;
    const firstName = d.name.split(" ")[0].toLowerCase();
    return {
      id,
      name: d.name,
      roll_no: `CSE${d.semester}${String(d.i + 1).padStart(3, "0")}`,
      email: `${firstName}.${d.i + 1}@students.example.edu`,
      department_id: DEPARTMENT.id,
      mentor_id: d.mentorId,
      semester: d.semester,
      avatar_hue: 200 + ((d.i * 37) % 150),
      signals: d.signals,
      score,
      score_history: buildHistory(makeRng(1000 + d.i), score.total_score),
      consents: {
        academic: true,
        attendance: true,
        placement: rng.chance(0.75),
        wellness: false, // locked — no data source yet
      },
    };
  });

  const meetings = buildMeetings(rng, students);

  // Demo identities: pick an amber student who has meeting history — the most
  // interesting student-dashboard view (actionable but not alarming).
  const amberWithHistory =
    students.find(
      (s) =>
        s.score.risk_category === "amber" &&
        meetings.some((m) => m.student_id === s.id && m.status === "completed"),
    ) ??
    students.find((s) => s.score.risk_category === "amber") ??
    students[0];

  return {
    department: DEPARTMENT,
    mentors,
    students,
    meetings,
    demoStudentId: amberWithHistory.id,
    demoMentorId: amberWithHistory.mentor_id,
  };
}

/* --------------------------- meetings --------------------------- */

const TOPIC_POOL = [
  "Attendance recovery plan",
  "Mid-sem performance review",
  "Backlog clearance strategy",
  "Internship & placement prep",
  "Resume and skills review",
  "Time management",
  "Project / capstone guidance",
  "Course selection for next sem",
  "Assignment submission gaps",
  "Wellbeing check-in",
];

const ACTION_POOL: Array<{ text: string; owner: ActionItem["owner"] }> = [
  { text: "Attend remedial classes for two flagged subjects", owner: "student" },
  { text: "Submit pending assignments by Friday", owner: "student" },
  { text: "Upload updated resume to the placement portal", owner: "student" },
  { text: "Complete one online certification this month", owner: "student" },
  { text: "Share attendance report with the student", owner: "mentor" },
  { text: "Connect student with a senior peer mentor", owner: "mentor" },
  { text: "Flag attendance shortfall to the academic office", owner: "mentor" },
  { text: "Book a follow-up slot in three weeks", owner: "mentor" },
];

const SUMMARY_POOL = [
  "Reviewed progress across all four signals. Student is aware of the gaps and willing to commit to a recovery plan.",
  "Discussed the dip in attendance and its knock-on effect on internals. Agreed on concrete next steps.",
  "Focused on placement readiness. Profile is incomplete; set a short checklist to close it out.",
  "Caught up on coursework load. Student feels stretched but on top of priorities for now.",
  "Worked through backlog options and the timeline to clear them before the next term.",
];

function isoDaysFromNow(days: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function buildMeetings(rng: Rng, students: Student[]): Meeting[] {
  const meetings: Meeting[] = [];
  let counter = 0;
  const newId = () => `mtg-${String(++counter).padStart(4, "0")}`;

  for (const s of students) {
    const risk = s.score.risk_category;
    // Higher-risk students have more mentoring history. A slice of every band
    // has none, so empty states show up naturally.
    const pastCount =
      risk === "coral"
        ? rng.int(1, 3)
        : risk === "amber"
          ? rng.int(0, 2)
          : rng.int(0, 1);

    const pastDates = Array.from({ length: pastCount }, () => rng.int(6, 95)).sort(
      (a, b) => b - a,
    );

    for (const ago of pastDates) {
      const topicCount = rng.int(1, 3);
      const topics = shuffle(rng, TOPIC_POOL).slice(0, topicCount);
      const actionCount = rng.int(1, 3);
      const action_items: ActionItem[] = shuffle(rng, ACTION_POOL)
        .slice(0, actionCount)
        .map((a, idx) => ({
          id: `${newId()}-a${idx}`,
          text: a.text,
          owner: a.owner,
          done: rng.chance(0.45),
        }));
      meetings.push({
        id: newId(),
        student_id: s.id,
        mentor_id: s.mentor_id,
        scheduled_for: isoDaysFromNow(-ago, rng.int(9, 16)),
        status: "completed",
        mode: rng.pick(["in-person", "video", "phone"] as const),
        log: {
          topics,
          summary: rng.pick(SUMMARY_POOL),
          action_items,
          next_meeting_date: rng.chance(0.6) ? isoDaysFromNow(rng.int(7, 28)) : undefined,
          logged_at: isoDaysFromNow(-ago + 0, rng.int(16, 20)),
        },
      });
    }

    // Upcoming meeting — more likely for at-risk students.
    const upcomingChance = risk === "coral" ? 0.7 : risk === "amber" ? 0.4 : 0.18;
    if (rng.chance(upcomingChance)) {
      meetings.push({
        id: newId(),
        student_id: s.id,
        mentor_id: s.mentor_id,
        scheduled_for: isoDaysFromNow(rng.int(1, 21), rng.int(9, 16)),
        status: "scheduled",
        mode: rng.pick(["in-person", "video", "phone"] as const),
      });
    }
  }
  return meetings;
}

function shuffle<T>(rng: Rng, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* --------------------------- singleton --------------------------- */

/** Built once at module load and treated as immutable by the API layer. */
export const DB = build();

export { riskCategory };
