import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * "quiet" — every functional dashboard card (default).
   * "strong" — Signal Disc and hero/marketing surfaces only, with specular sheen.
   */
  tier?: "quiet" | "strong";
  /** Adds the hover lift interaction (2px + deepened shadow). */
  interactive?: boolean;
  /** Default padding; pass `false` to lay out your own. */
  padded?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ tier = "quiet", interactive, padded = true, className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        tier === "strong" ? "glass-strong" : "glass-quiet",
        padded && "p-6",
        interactive &&
          "transition-all duration-300 will-change-transform hover:-translate-y-0.5 " +
            (tier === "strong" ? "hover:shadow-glass-lift" : "hover:shadow-[0_16px_34px_-10px_rgba(17,32,59,0.16)]"),
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  ),
);

GlassCard.displayName = "GlassCard";
