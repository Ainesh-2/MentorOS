import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Inline spinner for loading states. */
export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-block animate-spin rounded-full border-2 border-azure-200 border-t-azure-500", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Full-panel loading state with real copy. */
export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-soft">
      <Spinner size={26} />
      <p className="text-caption">{label}</p>
    </div>
  );
}

/** Inviting empty state — never apologetic (Section 1.8). */
export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-azure-200/50 text-azure-600">
          {icon}
        </div>
      )}
      <div className="max-w-sm">
        <h3 className="font-display text-body font-semibold text-ink">{title}</h3>
        {body && <p className="mt-1 text-caption text-ink-soft">{body}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
