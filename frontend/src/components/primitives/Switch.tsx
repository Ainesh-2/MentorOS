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
  // `isOn` is true when the switch should appear active/blue.
  const isOn = locked ? false : checked;

  return (
    <div className={cn("flex items-center justify-between gap-4 py-3", locked && "opacity-60")}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-body font-medium text-ink">{label}</span>
          {locked && <Lock size={13} className="text-ink-soft" />}
        </div>
        {(locked ? lockedNote : description) && (
          <p className="mt-0.5 text-caption text-ink-soft">{locked ? lockedNote : description}</p>
        )}
      </div>

      {/*
        Track: w-11 = 44px, h-6 = 24px
        Thumb: w-[18px] h-[18px], positioned with top/left px values
        OFF: left = 3px  → translateX(0)
        ON:  left = 3px  → translateX(20px)   (44 - 18 - 3 - 3 = 20)
      */}
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={label}
        disabled={disabled || locked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          "focus-visible:outline-2 focus-visible:outline-azure-500 focus-visible:outline-offset-2",
          locked
            ? "cursor-not-allowed bg-ink/[0.12]"
            : isOn
              ? "bg-azure-500"
              : "bg-ink/[0.16] hover:bg-ink/[0.22]",
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200",
            isOn ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}
