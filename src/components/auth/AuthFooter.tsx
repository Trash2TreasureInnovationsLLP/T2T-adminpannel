import React from "react";
import { Sparkles } from "lucide-react";

export function AuthFooter() {
  return (
    <div className="mt-8 border-t border-[#DDE6DE] pt-5 text-center">
      <p className="text-[11px] font-medium text-[#5F6F64] flex items-center justify-center gap-1.5">
        <Sparkles size={12} className="text-[#4F7F2B]" />
        Trash2Treasure Ecosystem • Authorized Personnel Only
      </p>
    </div>
  );
}

export default AuthFooter;
