import * as React from "react";
import { Input, type InputProps } from "@/components/Input";
import { isValidBangladeshiPhoneNumber } from "@/lib/phoneNumber";

export interface PhoneNumberInputProps
  extends Omit<InputProps, "value" | "onChange" | "type" | "errorText" | "helperText"> {
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  errorText?: string;
}

export const PhoneNumberInput = React.forwardRef<HTMLInputElement, PhoneNumberInputProps>(
  (
    {
      value,
      onChange,
      label = "Phone number",
      placeholder = "01XXXXXXXXX",
      helperText = "e.g. 01712345678",
      errorText = "Enter a valid Bangladeshi mobile number (11 digits, e.g. 01712345678).",
      onBlur,
      ...rest
    },
    ref
  ) => {
    const [touched, setTouched] = React.useState(false);

    const trimmed = value.trim();
    const showError = touched && trimmed !== "" && !isValidBangladeshiPhoneNumber(trimmed);

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => {
          setTouched(true);
          onBlur?.(event);
        }}
        helperText={showError ? undefined : helperText}
        errorText={showError ? errorText : undefined}
        {...rest}
      />
    );
  }
);

PhoneNumberInput.displayName = "PhoneNumberInput";
