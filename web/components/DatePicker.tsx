import * as React from "react";
import { Calendar } from "lucide-react";

export interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className = "", label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2 w-full">
        {label && <label className="text-sm font-bold text-[#1A1A1A]">{label}</label>}
        <div className="relative group">
          <input
            type="date"
            ref={ref}
            className={`
              w-full h-12 px-4 
              bg-white border text-base text-[#1A1A1A] rounded-xl outline-none transition-all
              hover:border-neutral-300 focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10
              ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "border-neutral-200"}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-red-500 font-medium mt-1">{error}</span>}
      </div>
    );
  }
);
DatePicker.displayName = "DatePicker";
