"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, RefreshCw, ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";
import { verifyAdminOtpAction, requestAdminOtpAction } from "../actions";
import { maskEmail } from "@/lib/auth-crypto";
import { motion } from "framer-motion";
import Link from "next/link";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthFooter } from "@/components/auth/AuthFooter";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [trustDevice, setTrustDevice] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

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
      className="w-full rounded-2xl border border-[#DDE6DE] bg-white p-8 sm:p-9 shadow-[0_8px_30px_rgba(0,0,0,0.06)] relative overflow-hidden"
    >
      {/* Top Brand Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#4F7F2B] via-[#0F9D58] to-[#D7FF4F]" />

      <AuthHeader
        title="Verify Email OTP"
        subtitle={`Sent a secure 6-digit code to ${maskEmail(email)}`}
        badgeText="Two-Factor Security"
        icon={<Lock size={28} className="text-[#4F7F2B]" />}
      />

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
              className="h-13 w-11 sm:w-13 rounded-xl border border-[#DDE6DE] bg-[#F5F8F4] text-center text-[20px] font-bold text-[#102A18] focus:border-[#4F7F2B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F7F2B]/20 transition-all shadow-sm"
            />
          ))}
        </div>

        {/* Live Timer Countdown */}
        <div className="flex items-center justify-between text-[13px] rounded-xl border border-[#DDE6DE] bg-[#F5F8F4] px-4 py-3 text-[#5F6F64]">
          <span>Code Expiry Status:</span>
          {timer > 0 ? (
            <span className="font-mono font-semibold text-[#4F7F2B]">
              {formatTimer(timer)}
            </span>
          ) : (
            <span className="font-semibold text-[#DC2626]">Code expired</span>
          )}
        </div>

        {/* Development Helper Banner */}
        {process.env.NODE_ENV === "development" && (
          <div className="rounded-xl border border-[#4F7F2B]/30 bg-[#4F7F2B]/5 p-3 text-center text-[12px] text-[#102A18]">
            <span className="text-[#4F7F2B] font-semibold">🔑 Dev Terminal OTP Code:</span>{" "}
            <code className="font-mono font-bold text-[#4F7F2B] bg-white px-2 py-0.5 rounded border border-[#DDE6DE]">123456</code>
          </div>
        )}

        {/* Trust Device Checkbox */}
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={trustDevice}
            onChange={(e) => setTrustDevice(e.target.checked)}
            className="h-4 w-4 rounded border-[#DDE6DE] bg-white text-[#4F7F2B] focus:ring-[#4F7F2B] cursor-pointer accent-[#4F7F2B]"
          />
          <span className="text-[13px] text-[#5F6F64] group-hover:text-[#102A18] transition-colors">
            Trust this device for 30 days
          </span>
        </label>

        {/* Primary Action Button */}
        <AuthButton
          type="submit"
          loading={loading}
          disabled={otp.join("").length < 6}
        >
          <span>Verify & Authenticate</span>
        </AuthButton>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 text-[13px] border-t border-[#DDE6DE]">
          <Link
            href="/login"
            className="flex items-center gap-1.5 font-medium text-[#5F6F64] hover:text-[#102A18] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Sign In</span>
          </Link>

          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="flex items-center gap-1.5 font-semibold text-[#4F7F2B] hover:text-[#3f6622] hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
          >
            <RefreshCw size={13} className={resendCooldown > 0 ? "animate-spin" : ""} />
            <span>
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
            </span>
          </button>
        </div>
      </form>

      <AuthFooter />
    </motion.div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full rounded-2xl border border-[#DDE6DE] bg-white p-12 text-center text-[#5F6F64]">
          Loading verification portal...
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
