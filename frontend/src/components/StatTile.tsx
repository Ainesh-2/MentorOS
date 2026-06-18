import type { ReactNode } from "react";
import { GlassCard } from "@/components/primitives";
import { cn } from "@/lib/utils";

/** Compact KPI tile — big mono value, label, optional icon + accent. */
export function StatTile({
  label,
  value,
  sublabel,
  icon,
  accent,
  className,
}: {
  label: string;
  value: ReactNode;
  sublabel?: string;
  icon?: ReactNode;
  /** Optional left accent color (e.g. a risk hex). */
  accent?: string;
  className?: string;
}) {
  return (
    <GlassCard padded={false} className={cn("relative overflow-hidden p-4", className)}>
      {accent && (
        <span
          className="absolute inset-y-0 left-0 w-1"
          style={{ background: accent }}
          aria-hidden
        />
      )}
      <div className="flex items-start justify-between gap-2">
        <p className="text-caption font-medium text-ink-soft">{label}</p>
        {icon && <span className="text-ink-soft/70">{icon}</span>}
      </div>
      <p className="mt-2 font-mono tnum text-[28px] font-semibold leading-none text-ink">
        {value}
      </p>
      {sublabel && <p className="mt-1.5 text-caption text-ink-soft">{sublabel}</p>}
    </GlassCard>
  );
}
