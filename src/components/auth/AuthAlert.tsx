import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function AuthError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-[#DC2626]/20 bg-[#DC2626]/5 p-3.5 text-[13px] text-[#DC2626]">
      <AlertCircle size={17} className="shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

export function AuthSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-[#15803D]/20 bg-[#15803D]/5 p-3.5 text-[13px] text-[#15803D]">
      <CheckCircle2 size={17} className="shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}
