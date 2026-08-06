import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
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
