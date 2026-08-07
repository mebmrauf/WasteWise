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
import { StepProgress } from "@/components/StepProgress";
import { SummaryPanel, SummaryRow } from "@/components/SummaryPanel";
import { AuthApiError } from "@/lib/api/auth";
import { submitRecharge, type SubmitRechargeResult } from "@/lib/api/rewards";
import { isValidBangladeshiPhoneNumber } from "@/lib/phoneNumber";
import { MIN_RECHARGE_TAKA, calculatePointsForRecharge } from "@/lib/rewards";
import { formatBdt } from "@/lib/utils";

const STEP_LABELS = ["Operator", "SIM type", "Phone number", "Amount", "Confirm"];

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
  const [step, setStep] = React.useState(0);
  const [phase, setPhase] = React.useState<"form" | "result">("form");
  const stepHeadingRef = React.useRef<HTMLHeadingElement | null>(null);
  const isInitialStepRender = React.useRef(true);
  const [validationMessage, setValidationMessage] = React.useState<string | null>(null);

  const [operator, setOperator] = React.useState<MobileOperator | null>(null);
  const [simType, setSimType] = React.useState<SimType | null>(null);
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [amountTaka, setAmountTaka] = React.useState("");

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<SubmitRechargeResult | null>(null);

  React.useEffect(() => {
    if (isInitialStepRender.current) {
      isInitialStepRender.current = false;
      return;
    }
    stepHeadingRef.current?.focus();
  }, [step]);

  const trimmedPhone = phoneNumber.trim();
  const isPhoneValid = isValidBangladeshiPhoneNumber(trimmedPhone);

  const trimmedAmount = amountTaka.trim();
  const amountValue = trimmedAmount === "" ? 0 : Number(trimmedAmount);
  const isAmountValid = trimmedAmount !== "" && amountValue >= MIN_RECHARGE_TAKA;
  const pointsCost = isAmountValid ? calculatePointsForRecharge(amountValue) : 0;
  const exceedsBalance = isAmountValid && pointsCost > currentBalance;

  const isLastStep = step === STEP_LABELS.length - 1;
  const canSubmit =
    isLastStep && !isSubmitting && operator !== null && simType !== null && isPhoneValid && isAmountValid && !exceedsBalance;

  function handleNext() {
    if (step === 0 && operator === null) {
      setValidationMessage("Choose a mobile operator to continue.");
      return;
    }
    if (step === 1 && simType === null) {
      setValidationMessage("Choose a SIM type to continue.");
      return;
    }
    if (step === 2 && !isPhoneValid) {
      setValidationMessage("Enter a valid Bangladeshi mobile number to continue.");
      return;
    }
    if (step === 3 && !isAmountValid) {
      setValidationMessage(`Enter a recharge amount of at least ${MIN_RECHARGE_TAKA} Taka to continue.`);
      return;
    }
    setValidationMessage(null);
    setStep((current) => Math.min(current + 1, STEP_LABELS.length - 1));
  }

  function handleBack() {
    setValidationMessage(null);
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleConfirmRecharge() {
    if (operator === null || simType === null || !isPhoneValid || !isAmountValid) return;

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
    setStep(0);
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
        <StepProgress steps={STEP_LABELS} currentIndex={step} aria-label="Mobile recharge redemption progress" />
        <Button variant="ghost" size="sm" onClick={onExit} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <Card>
            {step === 0 && (
              <>
                <h2
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="text-h3 text-neutral-900 rounded-sm focus:outline-none focus:shadow-focus"
                >
                  Choose your mobile operator
                </h2>
                <OperatorSelector value={operator} onChange={setOperator} className="mt-5" />
              </>
            )}

            {step === 1 && (
              <>
                <h2
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="text-h3 text-neutral-900 rounded-sm focus:outline-none focus:shadow-focus"
                >
                  SIM type
                </h2>
                <SimTypeToggle value={simType} onChange={setSimType} className="mt-5" />
              </>
            )}

            {step === 2 && (
              <>
                <h2
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="text-h3 text-neutral-900 rounded-sm focus:outline-none focus:shadow-focus"
                >
                  Phone number
                </h2>
                <p className="mt-1 text-body-sm text-neutral-500">Which number should we recharge?</p>
                <PhoneNumberInput value={phoneNumber} onChange={setPhoneNumber} className="mt-5" />
              </>
            )}

            {step === 3 && (
              <>
                <h2
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="text-h3 text-neutral-900 rounded-sm focus:outline-none focus:shadow-focus"
                >
                  Recharge amount
                </h2>
                <RechargeAmountInput
                  value={amountTaka}
                  onChange={setAmountTaka}
                  currentBalance={currentBalance}
                  className="mt-5"
                />
              </>
            )}

            {step === 4 && (
              <>
                <h2
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="text-h3 text-neutral-900 rounded-sm focus:outline-none focus:shadow-focus"
                >
                  Confirm your recharge
                </h2>
                <p className="mt-1 text-body-sm text-neutral-500">
                  Review the details below, then confirm from the summary panel.
                </p>
                <div className="mt-5 flex flex-col gap-3">
                  <SummaryRow label="Operator" value={operator ? MOBILE_OPERATOR_LABELS[operator] : "—"} />
                  <SummaryRow label="SIM type" value={simType === "PREPAID" ? "Prepaid" : simType === "POSTPAID" ? "Postpaid" : "—"} />
                  <SummaryRow label="Phone number" value={trimmedPhone || "—"} />
                  <SummaryRow label="Amount" value={isAmountValid ? formatBdt(amountValue) : "—"} />
                  <SummaryRow label="Points cost" value={isAmountValid ? `${pointsCost.toLocaleString()} pts` : "—"} />
                </div>
                {submitError && <ErrorBanner className="mt-4">{submitError}</ErrorBanner>}
              </>
            )}

            {validationMessage && <ErrorBanner className="mt-4">{validationMessage}</ErrorBanner>}
          </Card>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="secondary" onClick={handleBack} disabled={step === 0}>
              Back
            </Button>
            {!isLastStep ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <p className="text-body-sm text-neutral-500">Review your recharge, then confirm from the summary.</p>
            )}
          </div>
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
