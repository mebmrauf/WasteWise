import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Icon } from "@/components/Icon";
import { Input, type InputProps } from "@/components/Input";
import { MIN_RECHARGE_TAKA, calculatePointsForRecharge } from "@/lib/rewards";
import { cn } from "@/lib/utils";

function sanitizeIntegerInput(raw: string): string {
  return raw.replace(/\D/g, "");
}

export interface RechargeAmountInputProps
  extends Omit<InputProps, "value" | "onChange" | "type" | "inputMode" | "pattern" | "errorText" | "helperText"> {
  value: string;
  onChange: (value: string) => void;
  currentBalance: number;
  minTaka?: number;
  className?: string;
  wrapperClassName?: string;
}

export const RechargeAmountInput = React.forwardRef<HTMLInputElement, RechargeAmountInputProps>(
  (
    {
      value,
      onChange,
      currentBalance,
      minTaka = MIN_RECHARGE_TAKA,
      label = "Recharge amount (Taka)",
      placeholder,
      ...rest
    },
    ref
  ) => {
    const trimmed = value.trim();
    const hasValue = trimmed !== "";
    const amountTaka = hasValue ? Number(trimmed) : 0;
    const pointsCost = hasValue ? calculatePointsForRecharge(amountTaka) : 0;
    const belowMin = hasValue && amountTaka < minTaka;
    const exceedsBalance = hasValue && !belowMin && pointsCost > currentBalance;

    const errorText = belowMin
      ? `Minimum recharge is ${minTaka} Taka.`
      : exceedsBalance
      ? `This costs ${pointsCost.toLocaleString()} points, but you only have ${currentBalance.toLocaleString()}.`
      : undefined;

    return (
      <div className="flex flex-col gap-2">
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          label={label}
          placeholder={placeholder ?? String(minTaka)}
          value={value}
          onChange={(event) => onChange(sanitizeIntegerInput(event.target.value))}
          errorText={errorText}
          {...rest}
        />

        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors shadow-sm",
            exceedsBalance ? "border-error-200 bg-error-50/50" : "border-primary-100 bg-primary-50/30"
          )}
        >
          <span className={cn("text-body-sm font-medium", exceedsBalance ? "text-error-700" : "text-primary-700")}>
            Points cost
          </span>
          <span
            className={cn(
              "font-data text-data-base",
              exceedsBalance ? "text-error-700" : "text-neutral-900"
            )}
          >
            {hasValue ? `${pointsCost.toLocaleString()} pts` : "—"}
          </span>
        </div>

        {exceedsBalance && (
          <p className="flex items-center gap-2 text-body-sm text-error-700">
            <Icon icon={AlertTriangle} size="sm" className="text-error-500" aria-hidden />
            Insufficient Green Points for this amount.
          </p>
        )}
      </div>
    );
  }
);

RechargeAmountInput.displayName = "RechargeAmountInput";
