"use client";

import * as React from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { MOBILE_OPERATOR_LABELS, OperatorSelector, type MobileOperator } from "@/components/OperatorSelector";
import { PhoneNumberInput } from "@/components/PhoneNumberInput";
import { RechargeAmountInput } from "@/components/RechargeAmountInput";
import { RechargeResult } from "@/components/RechargeResult";
import { SimTypeToggle, type SimType } from "@/components/SimTypeToggle";
import { SummaryPanel, SummaryRow } from "@/components/SummaryPanel";
import { AuthApiError } from "@/lib/api/auth";
import { submitRecharge, type SubmitRechargeResult } from "@/lib/api/rewards";
import { isValidBangladeshiPhoneNumber } from "@/lib/phoneNumber";
import { MIN_RECHARGE_TAKA, calculatePointsForRecharge } from "@/lib/rewards";
import { formatBdt } from "@/lib/utils";

const submitRechargeErrorMessages: Record<string, string> = {
  VALIDATION_ERROR: "Check your recharge details and try again.",
  INSUFFICIENT_POINTS: "You don't have enough Green Points for this recharge.",
  FORBIDDEN: "Your account isn't able to redeem Green Points.",
};

function resolveSubmitRechargeErrorMessage(err: unknown): string {
  if (err instanceof AuthApiError) {
    return submitRechargeErrorMessages[err.code] ?? "Something went wrong redeeming your points. Please try again.";
  }
  return "Something went wrong redeeming your points. Please try again.";
}

export interface RedeemRechargeWizardProps {
  currentBalance: number;
  onComplete: (result: SubmitRechargeResult) => void;
  onExit: () => void;
}

export function RedeemRechargeWizard({ currentBalance, onComplete, onExit }: RedeemRechargeWizardProps) {
  const [phase, setPhase] = React.useState<"form" | "result">("form");

  const [operator, setOperator] = React.useState<MobileOperator | null>(null);
  const [simType, setSimType] = React.useState<SimType | null>(null);
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [amountTaka, setAmountTaka] = React.useState("");

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<SubmitRechargeResult | null>(null);

  const trimmedPhone = phoneNumber.trim();
  const isPhoneValid = isValidBangladeshiPhoneNumber(trimmedPhone);

  const trimmedAmount = amountTaka.trim();
  const amountValue = trimmedAmount === "" ? 0 : Number(trimmedAmount);
  const isAmountValid = trimmedAmount !== "" && amountValue >= MIN_RECHARGE_TAKA;
  const pointsCost = isAmountValid ? calculatePointsForRecharge(amountValue) : 0;
  const exceedsBalance = isAmountValid && pointsCost > currentBalance;

  const canSubmit =
    !isSubmitting && operator !== null && simType !== null && isPhoneValid && isAmountValid && !exceedsBalance;

  async function handleConfirmRecharge() {
    if (!canSubmit) return;

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const submitted = await submitRecharge({
        operator,
        simType,
        phoneNumber: trimmedPhone,
        amountTaka: amountValue,
      });
      setResult(submitted);
      setPhase("result");
      setIsSubmitting(false);
      onComplete(submitted);
    } catch (err) {
      setSubmitError(resolveSubmitRechargeErrorMessage(err));
      setIsSubmitting(false);
    }
  }

  function handleRetry() {
    setResult(null);
    setPhase("form");
    setSubmitError(null);
  }

  if (phase === "result" && result) {
    return (
      <RechargeResult
        status={result.recharge.status}
        amountTaka={result.recharge.amountTaka}
        phoneNumber={result.recharge.phoneNumber}
        onRetry={result.recharge.status === "FAILED" ? handleRetry : undefined}
        onDone={onExit}
      />
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-h2 text-neutral-900">Mobile Recharge</h2>
        <Button variant="ghost" size="sm" onClick={onExit} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <Card className="flex flex-col gap-8">
            <div>
              <h3 className="text-h3 text-neutral-900 mb-5">Choose your mobile operator</h3>
              <OperatorSelector value={operator} onChange={setOperator} />
            </div>

            <div>
              <h3 className="text-h3 text-neutral-900 mb-5">SIM type</h3>
              <SimTypeToggle value={simType} onChange={setSimType} />
            </div>

            <div>
              <h3 className="text-h3 text-neutral-900 mb-1">Phone number</h3>
              <p className="mb-5 text-body-sm text-neutral-500">Which number should we recharge?</p>
              <PhoneNumberInput value={phoneNumber} onChange={setPhoneNumber} />
            </div>

            <div>
              <h3 className="text-h3 text-neutral-900 mb-5">Recharge amount</h3>
              <RechargeAmountInput
                value={amountTaka}
                onChange={setAmountTaka}
                currentBalance={currentBalance}
              />
            </div>
            
            {submitError && <ErrorBanner>{submitError}</ErrorBanner>}
          </Card>
        </div>

        <SummaryPanel
          title="Recharge summary"
          footer={
            <Button fullWidth disabled={!canSubmit} onClick={() => void handleConfirmRecharge()}>
              {isSubmitting ? "Redeeming…" : "Confirm & redeem"}
            </Button>
          }
        >
          <SummaryRow label="Operator" value={operator ? MOBILE_OPERATOR_LABELS[operator] : "Not selected yet"} />
          <SummaryRow
            label="SIM type"
            value={simType === "PREPAID" ? "Prepaid" : simType === "POSTPAID" ? "Postpaid" : "Not selected yet"}
          />
          <SummaryRow label="Phone number" value={trimmedPhone || "Not entered yet"} />
          <SummaryRow label="Amount" value={isAmountValid ? formatBdt(amountValue) : "Not entered yet"} />
          <SummaryRow
            label="Points cost"
            value={
              isAmountValid ? (
                <span className={exceedsBalance ? "text-error-700" : undefined}>{pointsCost.toLocaleString()} pts</span>
              ) : (
                "—"
              )
            }
          />
          <SummaryRow label="Your balance" value={`${currentBalance.toLocaleString()} pts`} />
        </SummaryPanel>
      </div>
    </div>
  );
}
