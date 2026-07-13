import { CalendarClock } from "lucide-react";
import { getMyStudentProfile, getStudentMeetings } from "@/api";
import { useAsync } from "@/lib/useAsync";
import { Button, EmptyState, GlassCard, LoadingState } from "@/components/primitives";
import { SectionHeading } from "@/components/SectionHeading";
import { MeetingTimeline } from "@/features/student/MeetingTimeline";

export default function MeetingsPage() {
  const student = useAsync(() => getMyStudentProfile(), []);
  const studentId = student.data?.id ?? "";
  const meetings = useAsync(() => getStudentMeetings(studentId), [studentId]);

  if (student.loading || meetings.loading) return <LoadingState label="Loading meetings…" />;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="My meetings"
        description="Notes and action items your mentor logged after each check-in."
      />
      <GlassCard>
        {meetings.error ? (
          <EmptyState
            icon={<CalendarClock size={22} />}
            title="Couldn't load meetings"
            body={meetings.error}
            action={<Button onClick={meetings.reload}>Try again</Button>}
          />
        ) : (
          <MeetingTimeline meetings={meetings.data ?? []} />
        )}
      </GlassCard>
    </div>
  );
}
