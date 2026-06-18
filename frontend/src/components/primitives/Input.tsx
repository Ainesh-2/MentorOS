import { forwardRef, useId } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-sm border border-ink/8 bg-white/70 px-3 text-body text-ink " +
  "placeholder:text-ink-soft/60 transition-colors duration-150 " +
  "focus:border-azure-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-azure-200 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

function FieldShell({
  label,
  hint,
  error,
  htmlFor,
  required,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-caption font-medium text-ink">
          {label}
          {required && <span className="ml-0.5 text-signal-coral">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-caption text-signal-coral">{error}</p>
      ) : (
        hint && <p className="text-caption text-ink-soft">{hint}</p>
      )}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  iconLeft?: ReactNode;
  /** Use mono tabular figures (roll numbers, dates, IDs). */
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, iconLeft, mono, className, id, required, ...rest }, ref) => {
    const auto = useId();
    const fieldId = id ?? auto;
    return (
      <FieldShell label={label} hint={hint} error={error} htmlFor={fieldId} required={required}>
        <div className="relative">
          {iconLeft && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">
              {iconLeft}
            </span>
          )}
          <input
            ref={ref}
            id={fieldId}
            required={required}
            className={cn(
              fieldBase,
              "h-11",
              iconLeft ? "pl-9" : "",
              mono && "font-mono tnum",
              error && "border-signal-coral focus:border-signal-coral focus:ring-[rgba(192,71,61,0.25)]",
              className,
            )}
            {...rest}
          />
        </div>
      </FieldShell>
    );
  },
);
Input.displayName = "Input";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, className, id, children, required, ...rest }, ref) => {
    const auto = useId();
    const fieldId = id ?? auto;
    return (
      <FieldShell label={label} hint={hint} error={error} htmlFor={fieldId} required={required}>
        <select
          ref={ref}
          id={fieldId}
          required={required}
          className={cn(fieldBase, "h-11 cursor-pointer appearance-none bg-no-repeat pr-9", className)}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%234A5A78' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E\")",
            backgroundPosition: "right 12px center",
          }}
          {...rest}
        >
          {children}
        </select>
      </FieldShell>
    );
  },
);
Select.displayName = "Select";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className, id, required, rows = 3, ...rest }, ref) => {
    const auto = useId();
    const fieldId = id ?? auto;
    return (
      <FieldShell label={label} hint={hint} error={error} htmlFor={fieldId} required={required}>
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          required={required}
          className={cn(fieldBase, "resize-none py-2.5 leading-6", className)}
          {...rest}
        />
      </FieldShell>
    );
  },
);
Textarea.displayName = "Textarea";
