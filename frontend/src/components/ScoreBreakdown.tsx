import type { ScoreBreakdown as Breakdown } from "@/types";
import { COMPONENT_META, componentValue } from "@/lib/score";
import { cn } from "@/lib/utils";

/**
 * Renders the four components as labelled bars with their weight and weighted
 * contribution — so the Success Score is explainable, never a mystery number
 * (Quality bar, Section 7). Shared by the student dashboard and the AI
 * Companion's get_my_score tool result.
 */
export function ScoreBreakdown({
  breakdown,
  compact = false,
  className,
}: {
  breakdown: Breakdown;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", compact ? "gap-3" : "gap-4", className)}>
      {COMPONENT_META.map((m) => {
        const value = componentValue(breakdown, m.key);
        const contribution = value * m.weight;
        return (
          <div key={m.key}>
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span className={cn("font-medium text-ink", compact ? "text-caption" : "text-body")}>
                  {m.label}
                </span>
                <span className="font-mono tnum text-[11px] text-ink-soft">
                  {Math.round(m.weight * 100)}%
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn("font-mono tnum font-semibold text-ink", compact ? "text-caption" : "text-body")}>
                  {Math.round(value)}
                </span>
                {!compact && (
                  <span className="font-mono tnum text-[11px] text-ink-soft">
                    +{contribution.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-azure-500 to-azure-600 transition-[width] duration-700"
                style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
              />
            </div>
            {!compact && <p className="mt-1 text-caption text-ink-soft">{m.description}</p>}
          </div>
        );
      })}
    </div>
  );
}
