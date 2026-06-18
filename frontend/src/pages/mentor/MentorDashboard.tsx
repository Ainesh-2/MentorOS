import { useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardCheck,
  ListChecks,
  Users,
  Video,
} from "lucide-react";
import type { RosterEntry } from "@/types";
import { DEMO, getMentor, getMentorRoster } from "@/api";
import { RISK_META } from "@/lib/score";
import { useAsync } from "@/lib/useAsync";
import { formatDate, formatTime } from "@/lib/utils";
import { Avatar, Button, EmptyState, LoadingState } from "@/components/primitives";
import { SectionHeading } from "@/components/SectionHeading";
import { StatTile } from "@/components/StatTile";
import { RosterTable } from "@/features/mentor/RosterTable";
import { ScheduleMeetingModal } from "@/features/mentor/ScheduleMeetingModal";
import { LogMeetingModal } from "@/features/mentor/LogMeetingModal";

export default function MentorDashboard() {
  const mentorId = DEMO.mentorId;
  const mentor = useAsync(() => getMentor(mentorId), [mentorId]);
  const roster = useAsync(() => getMentorRoster(mentorId), [mentorId]);

  const [scheduleFor, setScheduleFor] = useState<RosterEntry | null>(null);
  const [logFor, setLogFor] = useState<RosterEntry | null>(null);

  if (roster.loading || mentor.loading) return <LoadingState label="Loading your roster…" />;

  if (roster.error || !roster.data) {
    return (
      <EmptyState
        icon={<AlertTriangle size={22} />}
        title="We couldn't load your roster"
        body={roster.error ?? "Something went wrong fetching your mentees."}
        action={<Button onClick={roster.reload}>Try again</Button>}
      />
    );
  }

  const rows = roster.data;
  const riskCounts = { green: 0, amber: 0, coral: 0 };
  let openItems = 0;
  for (const r of rows) {
    riskCounts[r.student.score.risk_category]++;
    openItems += r.open_action_items;
  }
  const upcoming = rows
    .filter((r) => r.next_meeting)
    .sort(
      (a, b) =>
        new Date(a.next_meeting!.scheduled_for).getTime() -
        new Date(b.next_meeting!.scheduled_for).getTime(),
    );

  const firstName = mentor.data?.name.split(" ").slice(-1)[0] ?? "there";

  return (
    <div className="flex flex-col gap-8">
      <SectionHeading
        id="roster"
        title="Mentee roster"
        description={`${rows.length} students assigned to you — sorted with the lowest signals first.`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Mentees" value={rows.length} icon={<Users size={18} />} sublabel="In your care this term" />
        <StatTile
          label="At risk"
          value={riskCounts.coral}
          icon={<AlertTriangle size={18} />}
          accent={RISK_META.coral.hex}
          sublabel="Need attention now"
        />
        <StatTile
          label="To monitor"
          value={riskCounts.amber}
          accent={RISK_META.amber.hex}
          sublabel="Worth a check-in"
        />
        <StatTile
          label="Open action items"
          value={openItems}
          icon={<ListChecks size={18} />}
          sublabel="Across logged meetings"
        />
      </div>

      <RosterTable
        rows={rows}
        onSchedule={(e) => setScheduleFor(e)}
        onLog={(e) => setLogFor(e)}
      />

      {/* Upcoming meetings */}
      <section className="flex flex-col gap-4">
        <SectionHeading
          id="meetings"
          title="Upcoming meetings"
          description="Everything you've scheduled with your mentees."
        />
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<CalendarClock size={22} />}
            title="No meetings scheduled yet"
            body="Schedule your first check-in from the roster above — at-risk students are a good place to start."
          />
        ) : (
          <div className="glass-quiet divide-y divide-ink/8">
            {upcoming.map((e) => {
              const m = e.next_meeting!;
              return (
                <div key={m.id} className="flex flex-wrap items-center gap-3 p-4">
                  <Avatar name={e.student.name} hue={e.student.avatar_hue} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-medium text-ink">{e.student.name}</p>
                    <p className="font-mono tnum text-caption text-ink-soft">{e.student.roll_no}</p>
                  </div>
                  <div className="flex items-center gap-2 text-caption text-ink">
                    <CalendarClock size={15} className="text-ink-soft" />
                    <span className="font-mono tnum">
                      {formatDate(m.scheduled_for)} · {formatTime(m.scheduled_for)}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-ink/8 bg-white/60 px-2.5 py-0.5 text-caption capitalize text-ink-soft">
                    {m.mode === "video" && <Video size={13} />}
                    {m.mode}
                  </span>
                  <Button size="sm" variant="secondary" iconLeft={<ClipboardCheck size={15} />} onClick={() => setLogFor(e)}>
                    Log
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {scheduleFor && (
        <ScheduleMeetingModal
          open
          onClose={() => setScheduleFor(null)}
          studentId={scheduleFor.student.id}
          studentName={scheduleFor.student.name}
          mentorId={mentorId}
          onScheduled={() => roster.reload()}
        />
      )}
      {logFor && (
        <LogMeetingModal
          open
          onClose={() => setLogFor(null)}
          studentId={logFor.student.id}
          studentName={logFor.student.name}
          mentorId={mentorId}
          meetingId={logFor.next_meeting?.id}
          scheduledFor={logFor.next_meeting?.scheduled_for}
          onLogged={() => roster.reload()}
        />
      )}

      <p className="sr-only">Mentor dashboard for {firstName}</p>
    </div>
  );
}
