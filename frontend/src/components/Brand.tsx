import { cn } from "@/lib/utils";

/** The MentorOS mark — a miniature signal disc — plus the wordmark. */
export function Brand({
  size = "md",
  showWordmark = true,
  className,
}: {
  size?: "sm" | "md";
  showWordmark?: boolean;
  className?: string;
}) {
  const dim = size === "sm" ? 28 : 34;
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <rect width="32" height="32" rx="9" fill="var(--azure-500)" />
        <circle cx="16" cy="16" r="10" stroke="white" strokeWidth="1.4" opacity="0.5" />
        <path
          d="M16 7 L23 14 L19 24 L13 24 L9 14 Z"
          fill="var(--azure-200)"
          stroke="white"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="16" r="2.3" fill="white" />
      </svg>
      {showWordmark && (
        <span
          className={cn(
            "font-display font-semibold leading-none text-ink",
            size === "sm" ? "text-[18px]" : "text-[21px]",
          )}
        >
          MentorOS
        </span>
      )}
    </span>
  );
}
