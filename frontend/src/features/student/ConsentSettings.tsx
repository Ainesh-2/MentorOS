import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { ConsentSettings as Consents } from "@/types";
import { updateStudentConsents } from "@/api";
import { Switch } from "@/components/primitives";
import { toast } from "@/store/useToast";

type Key = keyof Consents;

const COPY: Record<Key, { label: string; description: string }> = {
  academic: {
    label: "Academic performance",
    description: "Internal marks and backlogs your mentor can see.",
  },
  attendance: {
    label: "Attendance",
    description: "Your attendance percentage across subjects.",
  },
  placement: {
    label: "Placement readiness",
    description: "Resume, skills and certification status.",
  },
  wellness: {
    label: "Wellbeing",
    description: "",
  },
};

export function ConsentSettings({
  studentId,
  consents: initial,
  isUnder18 = false,
}: {
  studentId: string;
  consents: Consents;
  /** DPDP: under-18 students cannot self-update — all categories lock. */
  isUnder18?: boolean;
}) {
  const [consents, setConsents] = useState<Consents>(initial);
  const [saving, setSaving] = useState<Key | null>(null);

  async function toggle(key: Key, next: boolean) {
    if (key === "wellness" || isUnder18) return; // locked
    const updated = { ...consents, [key]: next };
    setConsents(updated); // optimistic
    setSaving(key);
    await updateStudentConsents(studentId, updated);
    setSaving(null);
    toast.success(
      next
        ? `${COPY[key].label} sharing turned on.`
        : `${COPY[key].label} sharing turned off.`,
    );
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <ShieldCheck size={18} className="text-azure-600" />
        <span className="text-caption font-medium text-ink-soft">
          You decide what your mentor sees. Changes apply immediately.
        </span>
      </div>
      {isUnder18 && (
        <div className="mb-2 rounded-lg border border-signal-amber/20 bg-signal-amber/10 p-3 text-caption text-signal-amber">
          A parent or guardian must provide consent for this account. Contact your
          admin to enable parental approval.
        </div>
      )}
      <div className="divide-y divide-ink/8">
        {(["academic", "attendance", "placement"] as Key[]).map((key) => (
          <Switch
            key={key}
            label={COPY[key].label}
            locked={isUnder18}
            lockedNote={isUnder18 ? "Parent approval needed" : undefined}
            description={
              saving === key ? "Saving…" : COPY[key].description
            }
            checked={consents[key]}
            onChange={(next) => toggle(key, next)}
          />
        ))}
        <Switch
          label={COPY.wellness.label}
          locked
          lockedNote="No data source connected yet — nothing is collected or shared."
          checked={false}
          onChange={() => {}}
        />
      </div>
    </div>
  );
}
