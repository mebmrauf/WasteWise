/**
 * Card — general-purpose container. `interactive` adds the hover elevation/border treatment
 * for clickable cards; radius and padding never change on hover (design-system.md §6.2).
 *
 * Usage:
 *   <Card>Plain content block</Card>
 *   <Card interactive onClick={() => {}}>Clickable card row</Card>
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds the hover elevation/border treatment for clickable cards. */
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ interactive, className, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border border-neutral-200 bg-neutral-0 p-5 shadow-none lg:p-6",
          interactive && "cursor-pointer transition-shadow hover:border-neutral-300 hover:shadow-sm",
          className
        )}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
