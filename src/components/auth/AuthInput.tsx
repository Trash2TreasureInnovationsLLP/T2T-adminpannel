import React, { forwardRef } from "react";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, icon, rightElement, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        <label className="block text-[13px] font-semibold text-[#102A18]">
          {label}
        </label>
        <div className="relative flex items-center w-full">
          {icon && (
            <div className="absolute left-3.5 text-[#5F6F64] pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`h-[48px] w-full rounded-xl border bg-white text-[14px] text-[#102A18] placeholder-[#88998C] transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4F7F2B]/20 ${
              icon ? "pl-10" : "pl-3.5"
            } ${rightElement ? "pr-11" : "pr-3.5"} ${
              error
                ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20"
                : "border-[#DDE6DE] focus:border-[#4F7F2B]"
            } ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-2.5 flex items-center justify-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p className="text-[12px] font-medium text-[#DC2626] pl-1">{error}</p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = "AuthInput";
export default AuthInput;
