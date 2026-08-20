import * as React from "react";
import { CheckCircle2, XCircle, Smartphone, Check } from "lucide-react";
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
        className="flex flex-col items-center py-10 px-4 text-center"
      >
        <div className={`relative flex h-24 w-24 items-center justify-center rounded-full mb-6 ${isSuccess ? 'bg-success-100 text-success-600' : 'bg-error-100 text-error-600'}`}>
          {isSuccess && (
            <div className="absolute inset-0 rounded-full bg-success-200 animate-ping opacity-20"></div>
          )}
          <Icon
            icon={isSuccess ? Check : XCircle}
            size="lg"
            className="z-10 w-12 h-12"
            aria-hidden
          />
        </div>

        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-h2 font-heading text-neutral-900 focus:outline-none mb-2"
        >
          {isSuccess ? "Recharge Successful!" : "Recharge Failed"}
        </h2>
        
        <p className="text-body-lg text-neutral-500 mb-8 max-w-md">
          {isSuccess 
            ? "Your mobile recharge has been processed successfully and should arrive shortly."
            : "We couldn't process your recharge. Please double check the number and try again."}
        </p>

        {isSuccess && (
          <div className="w-full max-w-sm rounded-xl bg-neutral-50 p-6 border border-neutral-200 mb-8 flex flex-col gap-4">
            <div className="flex justify-between items-center text-body-sm">
              <span className="text-neutral-500">Phone Number</span>
              <span className="font-medium text-neutral-900 flex items-center gap-2">
                <Icon icon={Smartphone} size="sm" className="text-neutral-400" />
                {phoneNumber}
              </span>
            </div>
            <div className="flex justify-between items-center text-body-sm pt-4 border-t border-neutral-200">
              <span className="text-neutral-500">Amount Sent</span>
              <span className="font-data text-h4 text-success-600">{formatBdt(amountTaka)}</span>
            </div>
          </div>
        )}

        {(onRetry || onDone) && (
          <div className="flex w-full max-w-sm flex-col gap-3">
            {!isSuccess && onRetry && (
              <Button onClick={onRetry} size="lg" fullWidth>
                {retryLabel}
              </Button>
            )}
            {onDone && (
              <Button onClick={onDone} variant={isSuccess ? "primary" : "secondary"} size="lg" fullWidth>
                {doneLabel ?? (isSuccess ? "Done" : "Back to Dashboard")}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
