/**
 * Button — WasteWise primitive button/link.
 *
 * Usage:
 *   <Button>Save changes</Button>
 *   <Button variant="secondary" size="sm">Cancel</Button>
 *   <Button variant="ghost">View all</Button>
 *   <Button variant="destructive">Dispute this weight</Button>
 *   <Button href="/signup">Get started</Button>   // renders an <a>, same styles
 *
 * Renders a native <button> by default. Pass `href` to render an <a> instead
 * (e.g. marketing-page CTAs linking to another route) with the exact same
 * variant/size treatment.
 *
 * Variants/sizes/colors are wired directly to docs/design-system.md §6.1 via
 * Tailwind utilities generated from web/lib/tokens.ts.
 *
 * Known token gap (flagged, not guessed): §6.1 specifies a 1.5px border for
 * the `secondary`/`destructive` outline variants. Neither tokens.ts nor
 * Tailwind's default border-width scale (0/1/2/4/8px) has a 1.5px step, and
 * arbitrary values (`border-[1.5px]`) are disallowed — this uses the
 * standard 1px `border` utility as the closest non-invented approximation.
 * If 1.5px is truly required, add a `borderWidth` scale to tokens.ts first.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

interface SharedButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children?: React.ReactNode;
  /** Renders an <a> instead of a <button> when provided. */
  href?: string;
}

export type ButtonProps = SharedButtonProps &
  Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement> & React.AnchorHTMLAttributes<HTMLAnchorElement>,
    "className" | "color" | "href"
  >;

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-label gap-1",
  md: "h-10 px-5 text-body-sm gap-2",
  lg: "h-12 px-6 text-body gap-2",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary-600 text-neutral-0 hover:bg-primary-700 active:bg-primary-800",
  secondary:
    "bg-neutral-0 text-neutral-900 border border-neutral-800 hover:bg-neutral-50 active:bg-neutral-100",
  ghost: "bg-transparent text-primary-600 hover:bg-primary-50 active:bg-primary-100",
  destructive:
    "bg-neutral-0 text-error-500 border border-error-500 hover:bg-error-50 active:bg-error-50",
};

// Per §6.1: "Disabled: fill neutral-200, text neutral-400, no hover/active
// change, cursor not-allowed" — applied uniformly across variants. Verified
// against design-system.md v1.1's neutral-400-as-text restriction: this
// specific pairing (neutral-400 #9C988C on neutral-200 #DEDCD3) computes to
// ~2.1:1, below AA's 4.5:1, but WCAG 1.4.3 explicitly exempts text that is
// part of an inactive/disabled UI component from contrast requirements, so
// no change is needed here (unlike Input/Select's disabled *text content*,
// which isn't exempt and was migrated to neutral-500).
const disabledClasses = "bg-neutral-200 text-neutral-400 border-transparent cursor-not-allowed pointer-events-none";

const baseClasses =
  "inline-flex items-center justify-center rounded-md transition-colors " +
  "focus-visible:outline-none focus-visible:shadow-focus";

export const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ variant = "primary", size = "md", fullWidth, className, children, href, ...rest }, ref) => {
    const isDisabled = Boolean((rest as { disabled?: boolean }).disabled);

    const classes = cn(
      baseClasses,
      sizeClasses[size],
      isDisabled ? disabledClasses : variantClasses[variant],
      fullWidth && "w-full",
      className
    );

    if (href !== undefined) {
      const { disabled: _disabled, ...anchorRest } = rest as React.AnchorHTMLAttributes<HTMLAnchorElement> & {
        disabled?: boolean;
      };
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={isDisabled ? undefined : href}
          aria-disabled={isDisabled || undefined}
          tabIndex={isDisabled ? -1 : undefined}
          className={classes}
          {...anchorRest}
        >
          {children}
        </a>
      );
    }

    const buttonRest = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={buttonRest.type ?? "button"}
        disabled={isDisabled}
        className={classes}
        {...buttonRest}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
