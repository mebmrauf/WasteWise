/**
 * PageContainer — max-width content wrapper with responsive page gutters.
 *
 * Usage:
 *   <PageContainer>
 *     <h1 className="text-h1">Page title</h1>
 *   </PageContainer>
 *
 *   <PageContainer as="main">...</PageContainer>
 *
 * Per docs/design-system.md §3: content max-width 1280px (the `xl`
 * breakpoint's width, aliased as the `content` max-width token), centered,
 * with page gutters of `space-4` (16px) on mobile, `space-6` (24px) on
 * tablet (`md`+), `space-8` (32px) on desktop (`lg`+).
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Element/tag to render — defaults to `div`. */
  as?: "div" | "section" | "main";
}

export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ as = "div", className, children, ...rest }, ref) => {
    const Tag = as as React.ElementType;
    return (
      <Tag ref={ref} className={cn("mx-auto w-full max-w-content px-4 md:px-6 lg:px-8", className)} {...rest}>
        {children}
      </Tag>
    );
  }
);

PageContainer.displayName = "PageContainer";
