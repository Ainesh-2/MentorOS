import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const sizes = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-caption",
  lg: "h-12 w-12 text-body",
} as const;

export function Avatar({
  name,
  hue = 214,
  size = "md",
  className,
}: {
  name: string;
  /** Deterministic per-person hue so avatars stay stable. */
  hue?: number;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-mono font-medium tnum",
        sizes[size],
        className,
      )}
      style={{
        background: `linear-gradient(140deg, hsl(${hue} 70% 92%), hsl(${hue} 65% 82%))`,
        color: `hsl(${hue} 55% 32%)`,
        border: `1px solid hsl(${hue} 60% 85%)`,
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
