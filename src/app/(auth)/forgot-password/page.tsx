"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Mail, Loader2, ArrowLeft, CheckCircle, Leaf, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { requestPasswordResetAction } from "../actions";

const forgotPasswordSchema = zod.object({
  email: zod.string().email("Invalid administrator email address"),
});

type ForgotPasswordValues = zod.infer<typeof forgotPasswordSchema>;





export default function ForgotPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordValues) => {
    setLoading(true);
    try {
      const res = await requestPasswordResetAction(data.email);
      if (res.success) {
        setSubmitted(true);
        toast.success(res.message || "Password reset instructions sent to your email!");
      } else {
        toast.error(res.error || "Failed to process request");
      }
    } catch (error) {
      console.error("[ForgotPassword Submit Error]:", error);
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

      {/* Top Branding Header */}
      <div className="flex flex-col items-center text-center">
        <div className="group relative flex items-center justify-center">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#14EF10]/30 to-[#4F772D]/30 blur-md opacity-75 group-hover:opacity-100 transition duration-300" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0D140C] border border-[#14EF10]/40 text-[#14EF10] shadow-inner">
            <KeyRound size={28} className="text-[#14EF10] drop-shadow-[0_0_8px_rgba(20,239,16,0.6)]" />
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center">
          <h1 className="text-[26px] font-extrabold tracking-tight text-white sm:text-[28px]">
            Reset Password
          </h1>
          <p className="mt-1.5 text-[13px] text-neutral-400 max-w-[320px] leading-relaxed">
            Enter your admin email to receive secure recovery instructions
          </p>
        </div>
      </div>

      {submitted ? (
        <div className="mt-7 rounded-xl border border-[#14EF10]/30 bg-[#14EF10]/5 p-6 text-center space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#14EF10]/15 text-[#14EF10] border border-[#14EF10]/30 mx-auto">
            <CheckCircle size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-[16px] font-bold text-white">
              Check your email inbox
            </h3>
            <p className="text-[13px] text-neutral-400 leading-relaxed max-w-[300px] mx-auto">
              We have dispatched recovery instructions to your email address if an active admin account exists.
            </p>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="inline-flex items-center justify-center gap-2 text-[13px] font-bold text-[#14EF10] hover:text-[#10d00d] hover:underline pt-2"
          >
            <ArrowLeft size={16} />
            <span>Return to Sign In</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5">
          <div className="space-y-2">
            <label className="block text-[13px] font-medium text-neutral-300">
              Admin Email Address
            </label>
            <div className="relative flex items-center">
              <Mail size={18} className="absolute left-3.5 text-neutral-500 pointer-events-none" />
              <input
                type="email"
                {...register("email")}
                placeholder="admin@t2t.com"
                className="h-[48px] w-full rounded-xl border border-white/10 bg-[#121216] pl-10 pr-4 text-[14px] text-white placeholder:text-neutral-600 focus:border-[#14EF10] focus:ring-2 focus:ring-[#14EF10]/20 focus:outline-none transition-all duration-200"
              />
            </div>
            {errors.email && (
              <p className="text-[12px] font-medium text-red-400 pl-1">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#14EF10] via-[#10d00d] to-[#059669] px-4 text-[14px] font-bold text-black shadow-[0_0_20px_rgba(20,239,16,0.35)] hover:shadow-[0_0_28px_rgba(20,239,16,0.5)] active:scale-[0.99] disabled:opacity-60 transition-all duration-200 cursor-pointer"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin text-black" />
              ) : (
                <span>Send Reset Instructions</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] text-[13px] font-semibold text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Cancel and back to sign in</span>
            </button>
          </div>
        </form>
      )}
    </motion.div>
  );
}
