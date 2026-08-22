"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Mail, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { motion } from "framer-motion";
import { requestAdminOtpAction } from "../actions";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthPasswordInput } from "@/components/auth/AuthPasswordInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthError } from "@/components/auth/AuthAlert";
import { AuthFooter } from "@/components/auth/AuthFooter";

const loginSchema = zod.object({
  email: zod.string().email("Please enter a valid administrator email address"),
  password: zod.string().min(6, "Password must be at least 6 characters"),
  rememberDevice: zod.boolean().optional(),
});

type LoginFormValues = zod.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberDevice: true,
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await requestAdminOtpAction(data.email, data.password);
      if (res.success) {
        if (res.bypassOtp) {
          toast.success("Welcome back! Signed in successfully.");
          window.location.href = "/";
        } else {
          toast.success(res.message || "Verification code sent to your email!");
          router.push(`/verify-otp?email=${encodeURIComponent(data.email)}`);
        }
      } else {
        const errStr = res.error || "Invalid administrator credentials";
        setErrorMessage(errStr);
        toast.error(errStr);
      }
    } catch (error) {
      const errStr = "An error occurred during authentication. Please try again.";
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
        title="Admin Sign In"
        subtitle="Trash2Treasure Ecosystem Governance & Operations Portal"
        badgeText="Admin Operations Center"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5">
        <AuthError message={errorMessage} />

        {/* Email Field */}
        <AuthInput
          {...register("email")}
          label="Admin Email Address"
          type="email"
          autoComplete="email"
          placeholder="admin@trash2treasure.co.in"
          icon={<Mail size={18} />}
          error={errors.email?.message}
        />

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-[13px] font-semibold text-[#102A18]">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[12px] font-semibold text-[#4F7F2B] hover:text-[#3f6622] hover:underline transition-colors"
            >
              Forgot Password?
            </Link>
          </div>
          <AuthPasswordInput
            {...register("password")}
            label=""
            autoComplete="current-password"
            placeholder="••••••••••••"
            error={errors.password?.message}
          />
        </div>

        {/* Remember Device Checkbox */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              {...register("rememberDevice")}
              type="checkbox"
              className="h-4 w-4 rounded border-[#DDE6DE] bg-white text-[#4F7F2B] focus:ring-[#4F7F2B] cursor-pointer accent-[#4F7F2B]"
            />
            <span className="text-[13px] text-[#5F6F64] group-hover:text-[#102A18] transition-colors">
              Remember this device
            </span>
          </label>

          <span className="text-[11px] text-[#5F6F64] font-medium flex items-center gap-1">
            <CheckCircle2 size={12} className="text-[#0F9D58]" /> SSL Encrypted
          </span>
        </div>

        {/* Primary Action Button */}
        <AuthButton type="submit" loading={loading} className="mt-3">
          <span>Continue to Admin</span>
          <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
        </AuthButton>
      </form>

      <AuthFooter />
    </motion.div>
  );
}
