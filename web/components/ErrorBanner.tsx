/**
 * ErrorBanner — inline error/alert banner. Colors/radius come from the `error` semantic
 * token (design-system.md §1.3).
 *
 * Usage:
 *   {errorMessage && <ErrorBanner>{errorMessage}</ErrorBanner>}
 *
 * Accessibility: `role="alert"` is baked in, so callers should conditionally render this
 * component (rather than always rendering it empty) — otherwise the live-region fires with
 * nothing to announce.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ErrorBannerProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const ErrorBanner = React.forwardRef<HTMLParagraphElement, ErrorBannerProps>(
  ({ className, children, ...rest }, ref) => {
    return (
      <p
        ref={ref}
        role="alert"
        className={cn(
          "rounded-md border border-error-500 bg-error-50 p-3 text-body-sm text-error-700",
          className
        )}
        {...rest}
      >
        {children}
      </p>
    );
  }
);

ErrorBanner.displayName = "ErrorBanner";
