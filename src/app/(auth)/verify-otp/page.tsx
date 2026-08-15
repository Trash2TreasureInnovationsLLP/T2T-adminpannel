"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Leaf, Loader2, RefreshCw, ArrowLeft, ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { verifyAdminOtpAction, requestAdminOtpAction } from "../actions";
import { maskEmail } from "@/lib/auth-crypto";
import { motion } from "framer-motion";
import Link from "next/link";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(300); // 5 minutes
  const [resendCooldown, setResendCooldown] = useState(30); // 30 seconds resend cooldown
  const [trustDevice, setTrustDevice] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 5-minute expiry countdown timer
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // 30-second resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim().slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = Array(6).fill("");
      pastedData.split("").forEach((char, idx) => {
        newOtp[idx] = char;
      });
      setOtp(newOtp);
      inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join("");

    if (otpCode.length < 6) {
      toast.error("Please enter the complete 6-digit verification code");
      triggerShake();
      return;
    }

    if (timer === 0) {
      toast.error("Verification code has expired. Please request a new code.");
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      const res = await verifyAdminOtpAction(email, otpCode, trustDevice);
      if (res.success) {
        toast.success("Authentication verified cleanly!");
        window.location.href = "/";
      } else {
        triggerShake();
        toast.error(res.error || "Invalid verification code.");
      }
    } catch (error) {
      triggerShake();
      toast.error("An error occurred during verification");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setOtp(Array(6).fill(""));
    setTimer(300);
    setResendCooldown(30);

    const res = await requestAdminOtpAction(email);
    if (res.success) {
      toast.success(res.message || "New 6-digit code sent to your email!");
    } else {
      toast.error(res.error || "Failed to resend verification code.");
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
      transition={{ duration: 0.4 }}
      className="w-full rounded-2xl border border-white/10 bg-[#0A0A0C]/90 p-8 sm:p-9 shadow-2xl backdrop-blur-xl relative overflow-hidden"
    >
      {/* Top Ambient Highlight Border */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#14EF10]/40 to-transparent" />

      {/* Top Branding Header */}
      <div className="flex flex-col items-center text-center">
        <div className="group relative flex items-center justify-center">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#14EF10]/30 to-[#4F772D]/30 blur-md opacity-75 group-hover:opacity-100 transition duration-300" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0D140C] border border-[#14EF10]/40 text-[#14EF10] shadow-inner">
            <Lock size={28} className="text-[#14EF10] drop-shadow-[0_0_8px_rgba(20,239,16,0.6)]" />
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#14EF10]/10 border border-[#14EF10]/30 px-3 py-1 text-[11px] font-semibold text-[#14EF10] tracking-wide">
            <ShieldCheck size={13} />
            <span>Two-Factor Security</span>
          </div>

          <h1 className="mt-3 text-[26px] font-extrabold tracking-tight text-white sm:text-[28px]">
            Verify Email OTP
          </h1>
          <p className="mt-1.5 text-[13px] text-neutral-400 max-w-[340px] leading-relaxed">
            Sent a secure 6-digit code to{" "}
            <span className="font-semibold text-white font-mono">{maskEmail(email)}</span>
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-7 space-y-6">
        {/* Six Digit OTP Input Array */}
        <div className="flex items-center justify-center gap-2 sm:gap-2.5">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={idx === 0 ? handlePaste : undefined}
              className="h-13 w-11 sm:w-13 rounded-xl border border-white/10 bg-[#121216] text-center text-[20px] font-bold text-white focus:border-[#14EF10] focus:outline-none focus:ring-2 focus:ring-[#14EF10]/20 transition-all shadow-inner"
            />
          ))}
        </div>

        {/* Live Timer Countdown */}
        <div className="flex items-center justify-between text-[13px] rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-neutral-400">
          <span>Code Expiry Status:</span>
          {timer > 0 ? (
            <span className="font-mono font-semibold text-[#14EF10]">
              {formatTimer(timer)}
            </span>
          ) : (
            <span className="font-semibold text-red-400">Code expired</span>
          )}
        </div>

        {/* Development Helper Banner */}
        {process.env.NODE_ENV === "development" && (
          <div className="rounded-xl border border-[#14EF10]/30 bg-[#14EF10]/5 p-3 text-center text-[12px] text-neutral-300">
            <span className="text-[#14EF10] font-semibold">🔑 Dev Terminal OTP Code:</span>{" "}
            <code className="font-mono font-bold text-[#14EF10] bg-[#121216] px-2 py-0.5 rounded border border-[#14EF10]/20">123456</code>
            <p className="text-[11px] text-neutral-500 mt-1">Check terminal output for live email OTP dispatches.</p>
          </div>
        )}

        {/* Trust Device Checkbox */}
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={trustDevice}
            onChange={(e) => setTrustDevice(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-[#121216] text-[#14EF10] focus:ring-[#14EF10] focus:ring-offset-0 cursor-pointer accent-[#14EF10]"
          />
          <span className="text-[13px] text-neutral-300 group-hover:text-white transition-colors">
            Trust this device for 30 days
          </span>
        </label>

        {/* Primary Action Button */}
        <button
          type="submit"
          disabled={loading || otp.join("").length < 6}
          className="group relative flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#14EF10] via-[#10d00d] to-[#059669] px-4 text-[14px] font-bold text-black shadow-[0_0_20px_rgba(20,239,16,0.35)] hover:shadow-[0_0_28px_rgba(20,239,16,0.5)] active:scale-[0.99] disabled:opacity-60 transition-all duration-200 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin text-black" />
              <span>Verifying Code...</span>
            </>
          ) : (
            <span>Verify & Authenticate</span>
          )}
        </button>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 text-[13px] border-t border-white/5">
          <Link
            href="/login"
            className="flex items-center gap-1.5 font-medium text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Sign In</span>
          </Link>

          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="flex items-center gap-1.5 font-semibold text-[#14EF10] hover:text-[#10d00d] hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
          >
            <RefreshCw size={13} className={resendCooldown > 0 ? "animate-spin" : ""} />
            <span>
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
            </span>
          </button>
        </div>
      </form>
    </motion.div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full rounded-2xl border border-white/10 bg-[#0A0A0C]/90 p-12 text-center text-neutral-400">
          Loading verification portal...
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
