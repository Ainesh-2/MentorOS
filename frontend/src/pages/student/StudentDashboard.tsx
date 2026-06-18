import { AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { DEMO, getStudent, getStudentMeetings } from "@/api";
import { COMPONENT_META, RISK_META, componentValue } from "@/lib/score";
import { useAsync } from "@/lib/useAsync";
import { useAppStore } from "@/store/useAppStore";
import { Button, EmptyState, GlassCard, LoadingState } from "@/components/primitives";
import { SectionHeading } from "@/components/SectionHeading";
import { SignalDisc } from "@/components/SignalDisc";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { MeetingTimeline } from "@/features/student/MeetingTimeline";
import { ConsentSettings } from "@/features/student/ConsentSettings";

const GUIDANCE: Record<string, string> = {
  attendance: "Attending more classes is your fastest lift — attendance is 35% of the score.",
  academic: "Clearing internals and any backlogs would raise your academic signal the most.",
  engagement: "Logging in regularly and submitting assignments on time lifts your engagement.",
  placement: "Completing your placement profile — resume, skills, certifications — is the quickest win.",
};

export default function StudentDashboard() {
  const studentId = DEMO.studentId;
  const student = useAsync(() => getStudent(studentId), [studentId]);
  const meetings = useAsync(() => getStudentMeetings(studentId), [studentId]);
  const setCompanionOpen = useAppStore((s) => s.setCompanionOpen);

  if (student.loading) return <LoadingState label="Loading your progress…" />;
  if (student.error || !student.data) {
    return (
      <EmptyState
        icon={<AlertTriangle size={22} />}
        title="We couldn't load your dashboard"
        body={student.error ?? "Something went wrong."}
        action={<Button onClick={student.reload}>Try again</Button>}
      />
    );
  }

  const s = student.data;
  const risk = RISK_META[s.score.risk_category];
  const lowest = COMPONENT_META.reduce((min, m) =>
    componentValue(s.score, m.key) < componentValue(s.score, min.key) ? m : min,
  );

  return (
    <div className="flex flex-col gap-8">
      <SectionHeading
        id="overview"
        title={`Hi ${s.name.split(" ")[0]} — here's your signal`}
        description="One score, blended from four parts. Everything that feeds it is shown below."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Disc */}
        <GlassCard tier="strong" className="flex flex-col items-center justify-center gap-4 py-8">
          <SignalDisc breakdown={s.score} size="md" />
          <div className="text-center">
            <p className="text-body font-medium text-ink">
              You're <span style={{ color: risk.hex }}>{risk.label.toLowerCase()}</span>
            </p>
            <p className="mt-1 max-w-xs text-caption text-ink-soft">{risk.blurb}</p>
          </div>
        </GlassCard>

        {/* Breakdown */}
        <GlassCard className="flex flex-col gap-4">
          <div>
            <h3 className="font-display text-body font-semibold text-ink">What makes up your score</h3>
            <p className="text-caption text-ink-soft">
              Each bar is the raw component; the percentage is its weight in the total.
            </p>
          </div>
          <ScoreBreakdown breakdown={s.score} />
          <div className="mt-1 flex items-start gap-2 rounded-md bg-azure-200/35 p-3">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-azure-600" />
            <p className="text-caption text-ink">
              <span className="font-medium">Quickest win:</span> {GUIDANCE[lowest.key]}
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Companion CTA */}
      <GlassCard className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-azure-200/60 text-azure-600">
            <Sparkles size={20} />
          </span>
          <div>
            <p className="text-body font-medium text-ink">Questions about your score?</p>
            <p className="text-caption text-ink-soft">
              Ask the AI Companion how each part works — or book a meeting with your mentor.
            </p>
          </div>
        </div>
        <Button onClick={() => setCompanionOpen(true)} iconRight={<ArrowRight size={16} />}>
          Open AI Companion
        </Button>
      </GlassCard>

      {/* Meeting history */}
      <section className="flex flex-col gap-4">
        <SectionHeading
          id="meetings"
          title="Meeting history"
          description="Notes and action items your mentor logged after each check-in."
        />
        <GlassCard>
          {meetings.loading ? (
            <LoadingState label="Loading your meetings…" />
          ) : (
            <MeetingTimeline meetings={meetings.data ?? []} />
          )}
        </GlassCard>
      </section>

      {/* Consent */}
      <section className="flex flex-col gap-4">
        <SectionHeading
          id="consent"
          title="Privacy & consent"
          description="Your data, your call. Turn sharing on or off for each category."
        />
        <GlassCard>
          <ConsentSettings studentId={studentId} consents={s.consents} />
        </GlassCard>
      </section>
    </div>
  );
}
