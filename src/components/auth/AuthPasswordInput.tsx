import React, { useState, forwardRef } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { AuthInput } from "./AuthInput";

interface AuthPasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const AuthPasswordInput = forwardRef<HTMLInputElement, AuthPasswordInputProps>(
  ({ label = "Password", error, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <AuthInput
        ref={ref}
        label={label}
        type={showPassword ? "text" : "password"}
        icon={<Lock size={18} />}
        error={error}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5F6F64] hover:text-[#102A18] hover:bg-[#F5F8F4] transition-colors cursor-pointer focus:outline-none"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
        {...props}
      />
    );
  }
);

AuthPasswordInput.displayName = "AuthPasswordInput";
export default AuthPasswordInput;
