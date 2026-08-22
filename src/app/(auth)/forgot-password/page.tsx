"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Mail, ArrowLeft, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Link from "next/link";
import { requestPasswordResetAction } from "../actions";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthError, AuthSuccess } from "@/components/auth/AuthAlert";
import { AuthFooter } from "@/components/auth/AuthFooter";

const forgotPasswordSchema = zod.object({
  email: zod.string().email("Please enter a valid administrator email address"),
});

type ForgotPasswordValues = zod.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordValues) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await requestPasswordResetAction(data.email);
      if (res.success) {
        setSubmitted(true);
        toast.success("Password reset instructions dispatched!");
      } else {
        setErrorMessage(res.error || "Failed to process request.");
      }
    } catch (error) {
      setErrorMessage("An unexpected error occurred. Please try again.");
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
        title="Reset Password"
        subtitle="Enter your administrator email address to receive secure password recovery instructions."
        badgeText="Account Recovery"
        icon={<KeyRound size={28} className="text-[#4F7F2B]" />}
      />

      {submitted ? (
        <div className="mt-7 space-y-5">
          <AuthSuccess message="Check your inbox: If an account exists for that email address, reset instructions have been sent. Check your spam folder if necessary." />

          <Link
            href="/login"
            className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-[#DDE6DE] bg-[#F5F8F4] text-[13px] font-bold text-[#102A18] hover:bg-[#DDE6DE]/50 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Return to Sign In</span>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5">
          <AuthError message={errorMessage} />

          <AuthInput
            {...register("email")}
            label="Admin Email Address"
            type="email"
            autoComplete="email"
            placeholder="admin@trash2treasure.co.in"
            icon={<Mail size={18} />}
            error={errors.email?.message}
          />

          <div className="flex flex-col gap-3 pt-2">
            <AuthButton type="submit" loading={loading}>
              <span>Send Reset Instructions</span>
            </AuthButton>

            <Link
              href="/login"
              className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-[#DDE6DE] bg-[#F5F8F4] text-[13px] font-semibold text-[#5F6F64] hover:text-[#102A18] hover:bg-[#DDE6DE]/50 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Cancel and back to sign in</span>
            </Link>
          </div>
        </form>
      )}

      <AuthFooter />
    </motion.div>
  );
}
