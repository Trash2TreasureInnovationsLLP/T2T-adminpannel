"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { KeyRound, ArrowLeft, CheckCircle2, Check, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Link from "next/link";
import { resetAdminPasswordAction, validateResetTokenAction } from "../actions";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthPasswordInput } from "@/components/auth/AuthPasswordInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthError, AuthSuccess } from "@/components/auth/AuthAlert";
import { AuthFooter } from "@/components/auth/AuthFooter";

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
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  useEffect(() => {
    if (initialEmail && initialToken) {
      validateResetTokenAction(initialEmail, initialToken)
        .then((res) => {
          if (!res.valid) {
            setTokenError(res.error || "Reset link has expired or is invalid.");
          } else {
            setTokenError(null);
          }
        })
        .catch(() => {});
    }
  }, [initialEmail, initialToken]);

  // Password strength validation checks
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
      ? "bg-[#DC2626]"
      : strengthScore <= 3
      ? "bg-[#D97706]"
      : strengthScore === 4
      ? "bg-[#0F9D58]"
      : "bg-[#4F7F2B]";
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
    setErrorMessage(null);

    try {
      const res = await resetAdminPasswordAction({
        email: data.email,
        token: data.token,
        newPassword: data.newPassword,
      });

      if (res.success) {
        setResetSuccess(true);
        toast.success(res.message || "Password updated successfully!");
      } else {
        const errStr = res.error || "Failed to reset password.";
        setErrorMessage(errStr);
        toast.error(errStr);
      }
    } catch (error) {
      const errStr = "An unexpected error occurred. Please try again.";
      setErrorMessage(errStr);
      toast.error(errStr);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full rounded-2xl border border-[#DDE6DE] bg-white p-8 sm:p-9 shadow-[0_8px_30px_rgba(0,0,0,0.06)] relative overflow-hidden"
    >
      {/* Top Brand Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#4F7F2B] via-[#0F9D58] to-[#D7FF4F]" />

      <AuthHeader
        title="Create New Password"
        subtitle="Create a robust, unique password to secure your administrative portal access."
        badgeText="Admin Security"
        icon={<KeyRound size={28} className="text-[#4F7F2B]" />}
      />

      {resetSuccess ? (
        <div className="mt-7 space-y-5">
          <AuthSuccess message="Password updated successfully. You can now sign in to Admin with your new credentials." />

          <Link
            href="/login"
            className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#4F7F2B] text-[14px] font-bold text-white hover:bg-[#3f6622] transition-colors shadow-md"
          >
            <span>Continue to Admin →</span>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
          <AuthError message={tokenError || errorMessage} />

          {/* Email field */}
          <AuthInput
            {...register("email")}
            label="Admin Email Address"
            type="email"
            autoComplete="email"
            placeholder="admin@trash2treasure.co.in"
            error={errors.email?.message}
          />

          {/* Reset Token field */}
          <AuthInput
            {...register("token")}
            label="Security Reset Token"
            type="text"
            placeholder="e.g. A3F9B82C"
            className="font-mono uppercase tracking-wider text-[#4F7F2B]"
            error={errors.token?.message}
          />

          {/* New Password field */}
          <AuthPasswordInput
            {...register("newPassword")}
            label="New Password"
            autoComplete="new-password"
            placeholder="Enter at least 8 characters"
            error={errors.newPassword?.message}
          />

          {/* Password strength visualizer */}
          {passwordValue.length > 0 && (
            <div className="rounded-xl border border-[#DDE6DE] bg-[#F5F8F4] p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#5F6F64]">Strength:</span>
                <span className="font-bold text-[#102A18]">{strengthText}</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 h-1.5">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-full rounded-full transition-all duration-300 ${
                      level <= strengthScore ? strengthColor : "bg-[#DDE6DE]"
                    }`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-[#5F6F64] pt-1">
                <div className={`flex items-center gap-1 ${checks.length ? "text-[#0F9D58] font-medium" : ""}`}>
                  {checks.length ? <Check size={12} /> : <X size={12} />}
                  <span>8+ characters</span>
                </div>
                <div className={`flex items-center gap-1 ${checks.hasUpper && checks.hasLower ? "text-[#0F9D58] font-medium" : ""}`}>
                  {checks.hasUpper && checks.hasLower ? <Check size={12} /> : <X size={12} />}
                  <span>Upper & lower</span>
                </div>
                <div className={`flex items-center gap-1 ${checks.hasNumber ? "text-[#0F9D58] font-medium" : ""}`}>
                  {checks.hasNumber ? <Check size={12} /> : <X size={12} />}
                  <span>Numbers (0-9)</span>
                </div>
                <div className={`flex items-center gap-1 ${checks.hasSpecial ? "text-[#0F9D58] font-medium" : ""}`}>
                  {checks.hasSpecial ? <Check size={12} /> : <X size={12} />}
                  <span>Special symbol</span>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Password field */}
          <AuthPasswordInput
            {...register("confirmPassword")}
            label="Confirm New Password"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            error={errors.confirmPassword?.message}
          />

          <div className="flex flex-col gap-3 pt-3">
            <AuthButton type="submit" loading={loading}>
              <span>Update Password →</span>
            </AuthButton>

            <Link
              href="/login"
              className="flex h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#DDE6DE] bg-[#F5F8F4] text-[13px] font-semibold text-[#5F6F64] hover:text-[#102A18] hover:bg-[#DDE6DE]/50 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </form>
      )}

      <AuthFooter />
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 w-full items-center justify-center text-[#4F7F2B]">
          <ShieldCheck size={32} className="animate-pulse" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
