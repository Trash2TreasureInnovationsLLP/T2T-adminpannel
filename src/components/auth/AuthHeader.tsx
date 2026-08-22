import React from "react";
import { Leaf, ShieldCheck } from "lucide-react";

interface AuthHeaderProps {
  title: string;
  subtitle: string;
  badgeText?: string;
  icon?: React.ReactNode;
}

export function AuthHeader({
  title,
  subtitle,
  badgeText = "Operations Portal",
  icon,
}: AuthHeaderProps) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Brand Icon Badge */}
      <div className="group relative flex items-center justify-center">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#4F7F2B]/20 to-[#0F9D58]/20 blur-md opacity-75 group-hover:opacity-100 transition duration-300" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0F5EE] border border-[#DDE6DE] text-[#4F7F2B] shadow-sm">
          {icon || <Leaf size={28} className="fill-current text-[#4F7F2B]" />}
        </div>
      </div>

      {/* Header Info */}
      <div className="mt-5 flex flex-col items-center">
        {badgeText && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#4F7F2B]/10 border border-[#4F7F2B]/20 px-3 py-1 text-[11px] font-semibold text-[#4F7F2B] tracking-wide">
            <ShieldCheck size={13} />
            <span>{badgeText}</span>
          </div>
        )}

        <h1 className="mt-3 text-[24px] font-extrabold tracking-tight text-[#102A18] sm:text-[26px]">
          {title}
        </h1>
        <p className="mt-1.5 text-[13px] text-[#5F6F64] max-w-[320px] leading-relaxed">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

export default AuthHeader;
