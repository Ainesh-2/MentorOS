import type { HTMLAttributes, ReactNode } from "react";
import type { RiskCategory } from "@/types";
import { RISK_META } from "@/lib/score";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "azure" | RiskCategory;

const toneStyles: Record<Tone, string> = {
  neutral: "bg-ink/4 text-ink-soft border-ink/8",
  azure: "bg-azure-200/60 text-azure-600 border-azure-200",
  green: "bg-[rgba(47,143,107,0.12)] text-signal-green border-[rgba(47,143,107,0.25)]",
  amber: "bg-[rgba(201,138,46,0.12)] text-signal-amber border-[rgba(201,138,46,0.28)]",
  coral: "bg-[rgba(192,71,61,0.12)] text-signal-coral border-[rgba(192,71,61,0.3)]",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Show the leading status dot. */
  dot?: boolean;
  children: ReactNode;
}

export function Badge({ tone = "neutral", dot, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-caption font-medium",
        toneStyles[tone],
        className,
      )}
      {...rest}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            tone === "green" && "bg-signal-green",
            tone === "amber" && "bg-signal-amber",
            tone === "coral" && "bg-signal-coral animate-coral-pulse",
            tone === "azure" && "bg-azure-500",
            tone === "neutral" && "bg-ink-soft",
          )}
        />
      )}
      {children}
    </span>
  );
}

/** Risk-category badge with the canonical label ("On track" / "Monitor" / "At risk"). */
export function RiskBadge({
  category,
  className,
  showDot = true,
}: {
  category: RiskCategory;
  className?: string;
  showDot?: boolean;
}) {
  return (
    <Badge tone={category} dot={showDot} className={className}>
      {RISK_META[category].label}
    </Badge>
  );
}
