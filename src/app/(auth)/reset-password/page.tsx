"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { 
  KeyRound, 
  Eye, 
  EyeOff, 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  Lock, 
  AlertCircle,
  Check,
  X
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { resetAdminPasswordAction, validateResetTokenAction } from "../actions";
import Link from "next/link";

const resetSchema = zod
  .object({
    email: zod.string().email("Please enter a valid administrator email address"),
    token: zod.string().min(4, "Please enter the valid reset token"),
    newPassword: zod
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: zod.string().min(8, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetFormValues = zod.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const initialToken = searchParams.get("token") || "";

  const [loading, setLoading] = useState(false);
  const [tokenValidating, setTokenValidating] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: initialEmail,
      token: initialToken,
      newPassword: "",
      confirmPassword: "",
    },
  });

  const passwordValue = watch("newPassword", "");

  useEffect(() => {
    if (initialEmail) setValue("email", initialEmail);
    if (initialToken) setValue("token", initialToken);
  }, [initialEmail, initialToken, setValue]);

  // Optionally validate token on load if both email and token are provided in URL
  useEffect(() => {
    if (initialEmail && initialToken) {
      setTokenValidating(true);
      validateResetTokenAction(initialEmail, initialToken)
        .then((res) => {
          if (!res.valid) {
            setTokenError(res.error || "Reset link has expired or is invalid.");
          } else {
            setTokenError(null);
          }
        })
        .catch(() => {})
        .finally(() => setTokenValidating(false));
    }
  }, [initialEmail, initialToken]);

  // Password strength checks
  const checks = {
    length: passwordValue.length >= 8,
    hasUpper: /[A-Z]/.test(passwordValue),
    hasLower: /[a-z]/.test(passwordValue),
    hasNumber: /[0-9]/.test(passwordValue),
    hasSpecial: /[^A-Za-z0-9]/.test(passwordValue),
  };

  const strengthScore = Object.values(checks).filter(Boolean).length;
  const strengthColor =
    strengthScore <= 2
      ? "bg-red-500"
      : strengthScore <= 3
      ? "bg-amber-500"
      : strengthScore === 4
      ? "bg-emerald-400"
      : "bg-[#14EF10]";
  const strengthText =
    strengthScore <= 2
      ? "Weak"
      : strengthScore <= 3
      ? "Fair"
      : strengthScore === 4
      ? "Good"
      : "Strong";

  const onSubmit = async (data: ResetFormValues) => {
    setLoading(true);
    try {
      const res = await resetAdminPasswordAction({
        email: data.email,
        token: data.token,
        newPassword: data.newPassword,
      });

      if (res.success) {
        setResetSuccess(true);
        toast.success(res.message || "Password reset successfully!");
      } else {
        toast.error(res.error || "Failed to reset password.");
      }
    } catch (error) {
      console.error("[ResetPassword Submit Error]:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full rounded-2xl border border-white/10 bg-[#0A0A0C]/90 p-8 sm:p-9 shadow-2xl backdrop-blur-xl relative overflow-hidden"
    >
      {/* Top Ambient Highlight Border */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#14EF10]/40 to-transparent" />

      {/* Top Header & Branding */}
      <div className="flex flex-col items-center text-center">
        <div className="group relative flex items-center justify-center">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#14EF10]/30 to-[#4F772D]/30 blur-md opacity-75 group-hover:opacity-100 transition duration-300" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0D140C] border border-[#14EF10]/40 text-[#14EF10] shadow-inner">
            <KeyRound size={28} className="text-[#14EF10] drop-shadow-[0_0_8px_rgba(20,239,16,0.6)]" />
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#14EF10]/10 border border-[#14EF10]/30 px-3 py-1 text-[11px] font-semibold text-[#14EF10] tracking-wide">
            <ShieldCheck size={13} />
            <span>Admin Recovery</span>
          </div>

          <h1 className="mt-3 text-[26px] font-extrabold tracking-tight text-white sm:text-[28px]">
            Set New Password
          </h1>
          <p className="mt-1.5 text-[13px] text-neutral-400 max-w-[320px] leading-relaxed">
            Create a robust, unique password to secure your administrative portal access
          </p>
        </div>
      </div>

      {resetSuccess ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-7 rounded-xl border border-[#14EF10]/30 bg-[#14EF10]/5 p-6 text-center space-y-4"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#14EF10]/20 text-[#14EF10] border border-[#14EF10]/40 mx-auto shadow-[0_0_20px_rgba(20,239,16,0.3)]">
            <CheckCircle2 size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-[17px] font-bold text-white">
              Password Reset Complete!
            </h3>
            <p className="text-[13px] text-neutral-400 leading-relaxed max-w-[320px] mx-auto">
              Your administrator credentials have been updated securely. You can now sign in with your new password.
            </p>
          </div>
          <div className="pt-3">
            <button
              onClick={() => router.push("/login")}
              className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#14EF10] via-[#10d00d] to-[#059669] px-4 text-[14px] font-bold text-black shadow-[0_0_20px_rgba(20,239,16,0.35)] hover:shadow-[0_0_28px_rgba(20,239,16,0.5)] transition-all duration-200 cursor-pointer"
            >
              <span>Proceed to Sign In</span>
            </button>
          </div>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
          {tokenError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-[12px] text-red-300">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <span>{tokenError}</span>
                <div className="mt-1">
                  <Link href="/forgot-password" className="font-bold underline text-red-200 hover:text-white">
                    Request a new reset link
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Email field */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-neutral-300">
              Admin Email
            </label>
            <input
              type="email"
              {...register("email")}
              placeholder="admin@t2t.com"
              className="h-[44px] w-full rounded-xl border border-white/10 bg-[#121216] px-3.5 text-[13px] text-white placeholder:text-neutral-600 focus:border-[#14EF10] focus:ring-2 focus:ring-[#14EF10]/20 focus:outline-none transition-all duration-200"
            />
            {errors.email && (
              <p className="text-[11px] font-medium text-red-400 pl-1">{errors.email.message}</p>
            )}
          </div>

          {/* Reset Token field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[12px] font-medium text-neutral-300">
                Security Reset Token
              </label>
              {tokenValidating && (
                <span className="text-[11px] text-[#14EF10] inline-flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" /> Validating token
                </span>
              )}
            </div>
            <input
              type="text"
              {...register("token")}
              placeholder="e.g. A3F9B82C"
              className="h-[44px] w-full rounded-xl border border-white/10 bg-[#121216] px-3.5 font-mono text-[13px] text-[#14EF10] tracking-wider placeholder:text-neutral-600 focus:border-[#14EF10] focus:ring-2 focus:ring-[#14EF10]/20 focus:outline-none transition-all duration-200 uppercase"
            />
            {errors.token && (
              <p className="text-[11px] font-medium text-red-400 pl-1">{errors.token.message}</p>
            )}
          </div>

          {/* New Password field */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-neutral-300">
              New Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showNewPassword ? "text" : "password"}
                {...register("newPassword")}
                placeholder="Enter at least 8 characters"
                className="h-[44px] w-full rounded-xl border border-white/10 bg-[#121216] pl-3.5 pr-10 text-[13px] text-white placeholder:text-neutral-600 focus:border-[#14EF10] focus:ring-2 focus:ring-[#14EF10]/20 focus:outline-none transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((p) => !p)}
                className="absolute right-3 text-neutral-500 hover:text-neutral-300 transition-colors p-1"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-[11px] font-medium text-red-400 pl-1">{errors.newPassword.message}</p>
            )}

            {/* Password strength visualizer */}
            {passwordValue.length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">Strength:</span>
                  <span className="font-bold text-white">{strengthText}</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 h-1.5">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-full rounded-full transition-all duration-300 ${
                        level <= strengthScore ? strengthColor : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-neutral-400 pt-1">
                  <div className={`flex items-center gap-1.5 ${checks.length ? "text-[#14EF10]" : "text-neutral-500"}`}>
                    {checks.length ? <Check size={12} /> : <X size={12} />}
                    <span>8+ characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${checks.hasUpper && checks.hasLower ? "text-[#14EF10]" : "text-neutral-500"}`}>
                    {checks.hasUpper && checks.hasLower ? <Check size={12} /> : <X size={12} />}
                    <span>Upper & lower</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${checks.hasNumber ? "text-[#14EF10]" : "text-neutral-500"}`}>
                    {checks.hasNumber ? <Check size={12} /> : <X size={12} />}
                    <span>Numbers (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${checks.hasSpecial ? "text-[#14EF10]" : "text-neutral-500"}`}>
                    {checks.hasSpecial ? <Check size={12} /> : <X size={12} />}
                    <span>Special symbol</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password field */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-neutral-300">
              Confirm Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showConfirmPassword ? "text" : "password"}
                {...register("confirmPassword")}
                placeholder="Re-enter your new password"
                className="h-[44px] w-full rounded-xl border border-white/10 bg-[#121216] pl-3.5 pr-10 text-[13px] text-white placeholder:text-neutral-600 focus:border-[#14EF10] focus:ring-2 focus:ring-[#14EF10]/20 focus:outline-none transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((p) => !p)}
                className="absolute right-3 text-neutral-500 hover:text-neutral-300 transition-colors p-1"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-[11px] font-medium text-red-400 pl-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-3">
            <button
              type="submit"
              disabled={loading}
              className="group relative flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#14EF10] via-[#10d00d] to-[#059669] px-4 text-[14px] font-bold text-black shadow-[0_0_20px_rgba(20,239,16,0.35)] hover:shadow-[0_0_28px_rgba(20,239,16,0.5)] active:scale-[0.99] disabled:opacity-60 transition-all duration-200 cursor-pointer"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin text-black" />
              ) : (
                <span>Update Password & Save</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="flex h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] text-[13px] font-semibold text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back to Sign In</span>
            </button>
          </div>
        </form>
      )}
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 w-full items-center justify-center text-white">
          <Loader2 className="animate-spin text-[#14EF10]" size={32} />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
