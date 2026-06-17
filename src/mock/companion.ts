/**
 * Canned FAQ knowledge base for the AI Companion. The matcher in
 * `@/api/companion` scores user text against these keyword sets. Swapping in a
 * real Claude call later means replacing that matcher, not this content.
 */

export interface FaqEntry {
  id: string;
  keywords: string[];
  answer: string;
  /** Quick-reply chips offered after the answer. */
  suggestions?: string[];
}

export const FAQ: FaqEntry[] = [
  {
    id: "what-is-score",
    keywords: ["how", "score", "work", "calculated", "formula", "computed", "breakdown"],
    answer:
      "Your Success Score is a single 0–100 signal blended from four parts: Attendance (35%), Academic (35%), Engagement (15%) and Placement readiness (15%). It's fully transparent — open your dashboard to see exactly what each part contributes.",
    suggestions: ["Show my score", "How do I improve it?"],
  },
  {
    id: "what-is-mentoros",
    keywords: ["what", "mentoros", "you", "do", "purpose", "about", "help"],
    answer:
      "I'm your MentorOS companion. I can explain your Success Score, walk you through what affects each part, help you book a meeting with your mentor, and point you to the next useful step. Ask me anything about your progress.",
    suggestions: ["How does the score work?", "Book a meeting"],
  },
  {
    id: "book-meeting",
    keywords: ["book", "schedule", "meeting", "appointment", "mentor", "meet", "slot"],
    answer:
      "I can set up a meeting with your mentor. They'll see it on their roster and confirm a time. Want me to schedule one now?",
    suggestions: ["Schedule a meeting", "Who is my mentor?"],
  },
  {
    id: "improve-score",
    keywords: ["improve", "raise", "increase", "better", "boost", "higher", "fix"],
    answer:
      "The fastest lever depends on your lowest component. Attendance and Academic each carry 35% weight, so steady classes and clearing internals move the score most. Placement readiness is quick wins — uploading a resume and listing skills bumps it right away.",
    suggestions: ["Show my score", "How does attendance count?"],
  },
  {
    id: "attendance",
    keywords: ["attendance", "classes", "absent", "present", "percentage"],
    answer:
      "Attendance feeds the score directly — your attendance percentage is the component value, weighted at 35%. It's the single biggest lever, so consistent attendance is the surest way to lift your signal.",
    suggestions: ["How do I improve it?", "What about backlogs?"],
  },
  {
    id: "risk-bands",
    keywords: ["risk", "category", "red", "green", "amber", "yellow", "at-risk", "band"],
    answer:
      "There are three bands: On track (70 and above), Monitor (50–69) and At risk (below 50). The band only summarises the score — the four components tell you why you're there.",
    suggestions: ["Show my score", "How do I improve it?"],
  },
  {
    id: "backlogs",
    keywords: ["backlog", "fail", "arrear", "supplementary", "reattempt"],
    answer:
      "Each active backlog subtracts 10 points from your Academic component before weighting. Clearing them is one of the highest-impact things you can do — two cleared backlogs is up to 20 points back on a 35%-weighted component.",
    suggestions: ["How does academic count?", "Book a meeting"],
  },
  {
    id: "placement",
    keywords: ["placement", "resume", "skills", "certification", "profile", "job", "internship"],
    answer:
      "Placement readiness is a checklist: resume uploaded, skills listed, certifications added. Each completed item is a third of the 15% Placement component. These are the quickest wins on your whole profile.",
    suggestions: ["Show my score", "How do I improve it?"],
  },
  {
    id: "consent-privacy",
    keywords: ["consent", "privacy", "data", "share", "permission", "wellness", "private"],
    answer:
      "You control what your mentor sees. In Privacy & consent you can toggle sharing for Academic, Attendance and Placement data. Wellness is locked for now — there's no data source connected, so nothing is ever collected.",
    suggestions: ["Open privacy settings", "How does the score work?"],
  },
  {
    id: "engagement",
    keywords: ["engagement", "login", "assignment", "submission", "activity", "participation"],
    answer:
      "Engagement blends how often you log in with your assignment submission rate, measured against the cohort average — so it reflects your activity relative to your peers. It carries 15% of the score.",
    suggestions: ["Show my score", "How do I improve it?"],
  },
  {
    id: "who-is-mentor",
    keywords: ["who", "my", "mentor", "contact", "assigned", "name"],
    answer:
      "Your assigned mentor handles your check-ins and logs every meeting. You can reach them by booking a meeting — they'll get it on their roster straight away.",
    suggestions: ["Book a meeting", "Show my score"],
  },
];

export const COMPANION_GREETING =
  "Hi! I'm your MentorOS companion. I can explain your Success Score, help you book a meeting, or point you to the next useful step. What would you like to know?";

export const COMPANION_FALLBACK =
  "I'm not sure I caught that. I can explain how your Success Score works, break down any of its four parts, or book a meeting with your mentor. Try one of these:";

export const COMPANION_STARTERS = [
  "How does my score work?",
  "Show my score",
  "How do I improve it?",
  "Book a meeting",
];
