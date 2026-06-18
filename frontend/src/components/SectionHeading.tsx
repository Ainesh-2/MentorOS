import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Section title (Fraunces) + optional description and trailing action. */
export function SectionHeading({
  id,
  title,
  description,
  action,
  className,
}: {
  id?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      id={id}
      className={cn("flex flex-wrap items-end justify-between gap-3 scroll-mt-24", className)}
    >
      <div className="min-w-0">
        <h2 className="font-display text-heading font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1 text-body text-ink-soft">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
