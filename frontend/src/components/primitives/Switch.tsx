import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accessible toggle switch with a label/description row. */
export function Switch({
  checked,
  onChange,
  disabled,
  locked,
  label,
  description,
  lockedNote,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Renders a locked state (no data source) — grayed with a lock icon. */
  locked?: boolean;
  label: string;
  description?: string;
  lockedNote?: string;
}) {
  const isOff = locked ? false : checked;
  return (
    <div className={cn("flex items-start justify-between gap-4 py-3", locked && "opacity-60")}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-body font-medium text-ink">{label}</span>
          {locked && <Lock size={13} className="text-ink-soft" />}
        </div>
        {(locked ? lockedNote : description) && (
          <p className="mt-0.5 text-caption text-ink-soft">{locked ? lockedNote : description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isOff}
        aria-label={label}
        disabled={disabled || locked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          "focus-visible:outline-2 focus-visible:outline-azure-500 focus-visible:outline-offset-2",
          locked
            ? "cursor-not-allowed bg-ink/[0.12]"
            : isOff
              ? "bg-azure-500"
              : "bg-ink/[0.16] hover:bg-ink/[0.22]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
            isOff ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
