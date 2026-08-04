/**
 * Input — WasteWise primitive text input with label + helper/error text.
 *
 * Usage:
 *   <Input label="Email" placeholder="you@example.com" />
 *   <Input label="Phone" helperText="We'll only use this for pickup updates." />
 *   <Input label="Weight (kg)" errorText="Enter a value greater than 0." />
 *
 * Colors/spacing/radius/type come from docs/design-system.md §1.2 (neutral
 * scale — resting/disabled border, placeholder/disabled text), §1.1 (focus
 * border = primary-500), §2.2 (text-label for the field label, text-body-sm
 * for helper/error text), §4.1 (radius-md for form inputs) via
 * web/lib/tokens.ts.
 *
 * Accessibility: label is associated via `htmlFor`/`id` (auto-generated with
 * `useId` when `id` isn't supplied); helper/error text is wired to the field
 * with `aria-describedby`; `aria-invalid` is set whenever `errorText` is
 * present. `errorText` takes precedence over `helperText` when both are set.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  helperText?: string;
  errorText?: string;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, errorText, id, className, wrapperClassName, disabled, ...rest }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const descriptionId = `${inputId}-description`;
    const hasError = Boolean(errorText);
    const message = errorText ?? helperText;

    return (
      <div className={cn("flex flex-col gap-1", wrapperClassName)}>
        {label && (
          <label htmlFor={inputId} className="text-label text-neutral-800">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={message ? descriptionId : undefined}
          className={cn(
            "w-full rounded-md border bg-neutral-0 px-3 py-2 text-body-sm text-neutral-900",
            "placeholder:text-neutral-500",
            "focus:outline-none focus-visible:shadow-focus",
            hasError ? "border-error-500 focus:border-error-500" : "border-neutral-300 focus:border-primary-500",
            disabled && "cursor-not-allowed border-neutral-300 bg-neutral-100 text-neutral-500",
            className
          )}
          {...rest}
        />
        {message && (
          <p id={descriptionId} className={cn("text-body-sm", hasError ? "text-error-700" : "text-neutral-500")}>
            {message}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
