import { UserCircle2 } from "lucide-react";
import { getMyStudentProfile } from "@/api";
import { useAsync } from "@/lib/useAsync";
import { Button, EmptyState, GlassCard, LoadingState } from "@/components/primitives";
import { SectionHeading } from "@/components/SectionHeading";
import { ConsentSettings } from "@/features/student/ConsentSettings";

export default function ConsentPage() {
  const student = useAsync(() => getMyStudentProfile(), []);

  if (student.loading) return <LoadingState label="Loading…" />;
  if (student.error || !student.data) {
    return (
      <EmptyState
        icon={<UserCircle2 size={22} />}
        title="Profile not found"
        body="Make sure you're signed in."
        action={<Button onClick={student.reload}>Try again</Button>}
      />
    );
  }

  const s = student.data;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Privacy & consent"
        description="Your data, your call. Turn sharing on or off for each category."
      />
      <GlassCard>
        <ConsentSettings studentId={s.id} consents={s.consents} />
      </GlassCard>
    </div>
  );
}
