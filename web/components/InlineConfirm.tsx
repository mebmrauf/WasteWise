import * as React from "react";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

export interface InlineConfirmProps {
  confirming: boolean;
  trigger: React.ReactNode;
  triggerRef?: React.RefObject<HTMLElement | null>;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirmPending?: boolean;
  "aria-label"?: string;
  className?: string;
}

export function InlineConfirm({
  confirming,
  trigger,
  triggerRef,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isConfirmPending = false,
  "aria-label": ariaLabel,
  className,
}: InlineConfirmProps) {
  const confirmButtonRef = React.useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const messageId = React.useId();
  const wasConfirmingRef = React.useRef(false);

  React.useEffect(() => {
    if (confirming) {
      confirmButtonRef.current?.focus();
    } else if (wasConfirmingRef.current) {
      triggerRef?.current?.focus();
    }
    wasConfirmingRef.current = confirming;
  }, [confirming, triggerRef]);

  if (!confirming) {
    return <>{trigger}</>;
  }

  const resolvedAriaLabel = ariaLabel ?? (typeof message === "string" ? message : "Confirm this action");

  return (
    <div
      role="group"
      aria-label={resolvedAriaLabel}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      className={cn("flex flex-wrap items-center justify-end gap-3", className)}
    >
      <p id={messageId} role="status" className="text-body-sm text-neutral-700">
        {message}
      </p>
      <div className="flex items-center gap-2">
        <Button
          ref={confirmButtonRef}
          type="button"
          variant="destructive"
          size="sm"
          aria-describedby={messageId}
          disabled={isConfirmPending}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}
