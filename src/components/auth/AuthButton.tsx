import React from "react";
import { Loader2 } from "lucide-react";

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline";
}

export function AuthButton({
  loading = false,
  children,
  variant = "primary",
  disabled,
  className = "",
  ...props
}: AuthButtonProps) {
  const baseStyles =
    "group relative flex h-[48px] w-full items-center justify-center gap-2 rounded-xl text-[14px] font-bold transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-[#4F7F2B] text-white hover:bg-[#3f6622] shadow-[0_4px_12px_rgba(79,127,43,0.25)] hover:shadow-[0_6px_16px_rgba(79,127,43,0.35)]",
    secondary:
      "bg-[#0F9D58] text-white hover:bg-[#0c8249] shadow-[0_4px_12px_rgba(15,157,88,0.2)]",
    outline:
      "border border-[#DDE6DE] bg-white text-[#102A18] hover:bg-[#F5F8F4] hover:border-[#4F7F2B]/40",
  };

  return (
    <button
      disabled={loading || disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export default AuthButton;
