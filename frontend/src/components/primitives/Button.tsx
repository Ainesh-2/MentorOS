import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Icon element rendered before the label. */
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  /** Stretch to the width of the container. */
  block?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-sm transition-all duration-200 " +
  "focus-visible:outline-2 focus-visible:outline-azure-500 focus-visible:outline-offset-2 " +
  "disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-azure-500 text-white shadow-[0_6px_16px_-6px_rgba(45,111,224,0.6)] " +
    "hover:bg-azure-600 hover:shadow-[0_10px_22px_-6px_rgba(45,111,224,0.7)] active:translate-y-px",
  secondary:
    "bg-white/70 text-ink border border-white/70 backdrop-blur-sm shadow-glass-quiet " +
    "hover:bg-white hover:-translate-y-px active:translate-y-0",
  ghost:
    "bg-transparent text-ink-soft hover:bg-ink/4 hover:text-ink",
  danger:
    "bg-signal-coral text-white shadow-[0_6px_16px_-6px_rgba(192,71,61,0.55)] " +
    "hover:brightness-95 active:translate-y-px",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-caption",
  md: "h-11 px-4 text-body",
  lg: "h-12 px-6 text-body",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      iconLeft,
      iconRight,
      block,
      className,
      children,
      type = "button",
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], sizes[size], block && "w-full", className)}
      {...rest}
    >
      {iconLeft && <span className="shrink-0">{iconLeft}</span>}
      {children}
      {iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  ),
);

Button.displayName = "Button";
