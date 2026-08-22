import React from "react";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#F5F8F4] px-4 py-12 antialiased overflow-hidden selection:bg-[#4F7F2B]/20 selection:text-[#4F7F2B]">
      {/* Subtle Ambient Brand Background Highlights */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#4F7F2B]/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#0F9D58]/10 blur-[140px]" />

      {/* Grid Pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `radial-gradient(#DDE6DE 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Center Card Container */}
      <div className="relative z-10 w-full max-w-[440px] transition-all duration-300">
        {children}
      </div>
    </div>
  );
}

export default AuthLayout;
