import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className"> {
  label?: string;
  helperText?: string;
  errorText?: string;
  wrapperClassName?: string;
  className?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, helperText, errorText, id, className, wrapperClassName, disabled, options, ...rest }, ref) => {
    const generatedId = React.useId();
    const selectId = id ?? generatedId;
    const descriptionId = `${selectId}-description`;
    const hasError = Boolean(errorText);
    const message = errorText ?? helperText;

    return (
      <div className={cn("flex flex-col gap-1", wrapperClassName)}>
        {label && (
          <label htmlFor={selectId} className="text-label text-neutral-800">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={message ? descriptionId : undefined}
          className={cn(
            "w-full rounded-md border bg-neutral-0 px-3 py-2 text-body-sm text-neutral-900",
            "focus:outline-none focus-visible:shadow-focus",
            hasError ? "border-error-500 focus:border-error-500" : "border-neutral-300 focus:border-primary-500",
            disabled && "cursor-not-allowed border-neutral-300 bg-neutral-100 text-neutral-500",
            className
          )}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        {message && (
          <p id={descriptionId} className={cn("text-body-sm", hasError ? "text-error-700" : "text-neutral-500")}>
            {message}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
