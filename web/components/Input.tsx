import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  helperText?: string;
  errorText?: string;
  wrapperClassName?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, errorText, id, className, wrapperClassName, disabled, type, icon, iconPosition = "left", ...rest }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const descriptionId = `${inputId}-description`;
    const hasError = Boolean(errorText);
    const message = errorText ?? helperText;
    const isPassword = type === "password";
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div className={cn("flex flex-col gap-1", wrapperClassName)}>
        {label && (
          <label htmlFor={inputId} className="text-label text-neutral-800">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === "left" && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={isPassword ? (showPassword ? "text" : "password") : type}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            aria-describedby={message ? descriptionId : undefined}
            className={cn(
              "w-full rounded-md border bg-neutral-0 px-3 py-2 text-body-sm text-neutral-900",
              "placeholder:text-neutral-500",
              "focus:outline-none focus-visible:shadow-focus",
              hasError ? "border-error-500 focus:border-error-500" : "border-neutral-300 focus:border-primary-500",
              disabled && "cursor-not-allowed border-neutral-300 bg-neutral-100 text-neutral-500",
              isPassword && "pr-10",
              Boolean(icon) && iconPosition === "left" && "pl-10",
              Boolean(icon) && iconPosition === "right" && !isPassword && "pr-10",
              className
            )}
            {...rest}
          />
          {Boolean(icon) && iconPosition === "right" && !isPassword && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
              className={cn(
                "absolute inset-y-0 right-0 flex items-center px-3",
                "text-neutral-400 hover:text-neutral-600 transition-colors",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          )}
        </div>
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

