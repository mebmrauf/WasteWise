import * as React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Icon } from "@/components/Icon";
import type { MobileRechargeStatus } from "@/lib/rechargeStatus";
import { formatBdt } from "@/lib/utils";

export interface RechargeResultProps {
  status: MobileRechargeStatus;
  amountTaka: number;
  phoneNumber: string;
  onDone?: () => void;
  onRetry?: () => void;
  doneLabel?: string;
  retryLabel?: string;
  className?: string;
}

export function RechargeResult({
  status,
  amountTaka,
  phoneNumber,
  onDone,
  onRetry,
  doneLabel,
  retryLabel = "Try again",
  className,
}: RechargeResultProps) {
  const isSuccess = status === "SUCCESS";
  const headingRef = React.useRef<HTMLParagraphElement | null>(null);

  React.useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <Card className={className}>
      <div
        role={isSuccess ? "status" : "alert"}
        className="flex flex-col items-center gap-3 py-6 text-center"
      >
        <Icon
          icon={isSuccess ? CheckCircle2 : XCircle}
          size="lg"
          className={isSuccess ? "text-success-500" : "text-error-500"}
          aria-hidden
        />
        <p
          ref={headingRef}
          tabIndex={-1}
          className="max-w-md text-h4 text-neutral-900 rounded-sm focus:outline-none focus:shadow-focus"
        >
          {isSuccess
            ? `${formatBdt(amountTaka)} recharge sent to ${phoneNumber}`
            : "Recharge failed — please check your number and try again."}
        </p>
        {(onRetry || onDone) && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            {!isSuccess && onRetry && (
              <Button variant="secondary" onClick={onRetry}>
                {retryLabel}
              </Button>
            )}
            {onDone && <Button onClick={onDone}>{doneLabel ?? (isSuccess ? "Done" : "Back")}</Button>}
          </div>
        )}
      </div>
    </Card>
  );
}
