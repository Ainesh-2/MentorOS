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
}: {
  studentId: string;
  consents: Consents;
}) {
  const [consents, setConsents] = useState<Consents>(initial);
  const [saving, setSaving] = useState<Key | null>(null);

  async function toggle(key: Key, next: boolean) {
    if (key === "wellness") return; // locked
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
      <div className="divide-y divide-ink/8">
        {(["academic", "attendance", "placement"] as Key[]).map((key) => (
          <Switch
            key={key}
            label={COPY[key].label}
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
