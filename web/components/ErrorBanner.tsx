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
