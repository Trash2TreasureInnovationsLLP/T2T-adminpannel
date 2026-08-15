"use server";

import { createAdminClient, createBrowserClient } from "@/lib/supabase";
import { hashOtp, generateDeviceToken, parseUserAgent } from "@/lib/auth-crypto";
import { sendOtpEmail, sendPasswordResetEmail } from "@/lib/email";
import { cookies, headers } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid administrator email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6).regex(/^\d+$/, "OTP must be exactly 6 digits"),
});

/**
 * DB-backed Rate Limiter for secure IP and Account limiting
 */
async function checkRateLimit(
  supabase: ReturnType<typeof createAdminClient>,
  ipAddress: string,
  email: string,
  adminId?: string
): Promise<{ allowed: boolean; error?: string }> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 1000 * 60).toISOString();

  try {
    // 1. IP rate limiting (max 10 actions per minute from same IP)
    const { count: ipActions, error: ipError } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", ipAddress)
      .gte("created_at", oneMinuteAgo);

    if (ipError) {
      console.error("[Rate Limit IP Audit Logs Query Error]:", ipError);
      throw ipError;
    }

    if (ipActions !== null && ipActions > 10) {
      return { allowed: false, error: "Rate limit exceeded. Too many requests from this IP. Please wait 1 minute." };
    }

    // 2. Resend rate limiting (max 3 OTP requests per admin in 5 minutes)
    if (adminId) {
      const { count: emailOtps, error: otpError } = await supabase
        .from("admin_otps")
        .select("*", { count: "exact", head: true })
        .eq("admin_id", adminId)
        .gte("created_at", fiveMinutesAgo);

      if (otpError) {
        console.error("[Rate Limit OTPs Query Error]:", otpError);
        throw otpError;
      }

      if (emailOtps !== null && emailOtps >= 3) {
        return { allowed: false, error: "Verification code requested too frequently. Please wait a few minutes." };
      }
    }
  } catch (error) {
    console.error("[Rate Limit DB Check Error]:", error);
    // Don't block the login flow entirely on rate-limiting DB failures, but log it
  }

  return { allowed: true };
}

export async function requestAdminOtpAction(emailInput: string, passwordInput?: string) {
  const supabase = createAdminClient();

  try {
    const validated = loginSchema.safeParse({ email: emailInput, password: passwordInput });
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0]?.message || "Invalid inputs." };
    }

    const { email, password } = validated.data;

    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || null;
    const ipAddress = reqHeaders.get("x-forwarded-for") || reqHeaders.get("x-real-ip") || "127.0.0.1";
    const { browser, os } = parseUserAgent(userAgent);

    // Auto-seed default admin ONLY if database has 0 admins
    try {
      const { count: adminCount, error: countError } = await supabase
        .from("admins")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;

      if (adminCount === 0) {
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash("Password123!", salt);
        
        const { error: seedError } = await supabase
          .from("admins")
          .insert({
            email: "admin@t2t.com",
            name: "Super Admin",
            password: hashedPassword,
            role: "super_admin",
          });

        if (seedError) throw seedError;
      }
    } catch (e) {
      console.error("[DB Admin Auto-Seed Error]:", e);
    }

    // Find admin by email
    let { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (adminError) {
      console.error("[Admin Find Query Error]:", adminError);
      return { success: false, error: `Database service unavailable: ${adminError.message}` };
    }

    // Fallback: If not found in admins table, look up in public.profiles or auth.users
    if (!admin) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, email, full_name, role")
          .eq("email", email)
          .maybeSingle();

        if (profile) {
          // Auto-provision admin record for this user
          const { data: newAdmin, error: createAdminErr } = await supabase
            .from("admins")
            .insert({
              auth_user_id: profile.id,
              user_id: profile.id,
              profile_id: profile.id,
              email: profile.email,
              name: profile.full_name || "Administrator",
              role: profile.role || "regional_admin",
              admin_type: (profile.role as any) || "regional_admin",
              status: "active",
              permissions: JSON.parse('["*"]'),
            })
            .select("*")
            .single();

          if (!createAdminErr && newAdmin) {
            admin = newAdmin;
          }
        }
      } catch (fallbackErr) {
        console.warn("⚠️ Profile fallback notice:", fallbackErr);
      }
    }

    if (!admin) {
      return { success: false, error: "Administrator account not found." };
    }

    // Apply Rate Limiting
    const rateCheck = await checkRateLimit(supabase, ipAddress, email, admin.id);
    if (!rateCheck.allowed) {
      return { success: false, error: rateCheck.error };
    }

    // Lockout verification
    if (admin.is_locked && admin.locked_until) {
      if (new Date(admin.locked_until) > new Date()) {
        const minutesLeft = Math.ceil(
          (new Date(admin.locked_until).getTime() - Date.now()) / (60 * 1000)
        );
        return {
          success: false,
          error: `Account is locked due to multiple failed login attempts. Try again in ${minutesLeft} minutes.`,
        };
      } else {
        // Lockout expired, reset status
        const { error: unlockError } = await supabase
          .from("admins")
          .update({ is_locked: false, locked_until: null, login_attempts: 0 })
          .eq("id", admin.id);

        if (unlockError) {
          console.error("[Unlock Admin Update Error]:", unlockError);
        }
      }
    }

    // Credentials check using Supabase Auth + safe bcrypt fallback
    let isPasswordCorrect = false;

    // 1. Try Supabase Auth sign in first (primary auth provider)
    try {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!authErr && authData?.user) {
        isPasswordCorrect = true;
      }
    } catch (_) {}

    // 2. Fallback: try bcrypt.compare if admin.password is a valid non-empty string
    if (!isPasswordCorrect && typeof admin.password === "string" && admin.password.trim().length > 0) {
      try {
        isPasswordCorrect = await bcrypt.compare(password, admin.password);
      } catch (bcryptErr) {
        console.warn("⚠️ Bcrypt comparison skipped/error:", bcryptErr);
      }
    }

    if (!isPasswordCorrect) {
      const newAttempts = admin.login_attempts + 1;
      const shouldLock = newAttempts >= 5;
      const lockedUntil = shouldLock ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

      try {
        const { error: updateError } = await supabase
          .from("admins")
          .update({
            login_attempts: newAttempts,
            is_locked: shouldLock,
            locked_until: lockedUntil,
          })
          .eq("id", admin.id);
        if (updateError) throw updateError;

        const { error: historyError } = await supabase
          .from("admin_login_histories")
          .insert({
            admin_id: admin.id,
            status: "FAILURE",
            ip_address: ipAddress,
            user_agent: userAgent,
          });
        if (historyError) throw historyError;

        const { error: logError } = await supabase
          .from("audit_logs")
          .insert({
            actor_id: admin.id,
            action: "LOGIN_FAILURE",
            target_entity: "auth",
            ip_address: ipAddress,
            user_agent: userAgent,
          });
        if (logError) throw logError;
      } catch (error) {
        console.error("[Login Failure Logger Error]:", error);
      }

      if (shouldLock) {
        return {
          success: false,
          error: "Too many failed attempts. Account locked for 15 minutes.",
        };
      }

      return { success: false, error: "Invalid email or password." };
    }

    // Trusted Device Bypass
    const cookieStore = await cookies();
    const rawTrustedToken = cookieStore.get("t2t_trusted_device")?.value;

    if (rawTrustedToken) {
      try {
        const hashedToken = crypto.createHash("sha256").update(rawTrustedToken).digest("hex");
        const { data: activeTrust, error: trustError } = await supabase
          .from("trusted_devices")
          .select("*")
          .eq("admin_id", admin.id)
          .eq("device_token", hashedToken)
          .gte("expires_at", new Date().toISOString())
          .maybeSingle();

        if (trustError) throw trustError;

        if (activeTrust) {
          // Create session
          const sessionToken = crypto.randomUUID();
          const hashedSessionToken = crypto.createHash("sha256").update(sessionToken).digest("hex");
          const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); // 8 hours

          const { error: sessionError } = await supabase
            .from("admin_sessions")
            .insert({
              admin_id: admin.id,
              session_token: hashedSessionToken,
              expires_at: expiresAt,
              ip_address: ipAddress,
              user_agent: userAgent,
            });
          if (sessionError) throw sessionError;

          cookieStore.set("t2t_session", sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 28800, // 8 hours
            path: "/",
          });

          // Reset login attempts
          const { error: resetAttemptsError } = await supabase
            .from("admins")
            .update({ login_attempts: 0, is_locked: false, locked_until: null })
            .eq("id", admin.id);
          if (resetAttemptsError) throw resetAttemptsError;

          // Record history
          const { error: successHistoryError } = await supabase
            .from("admin_login_histories")
            .insert({
              admin_id: admin.id,
              status: "SUCCESS",
              ip_address: ipAddress,
              user_agent: userAgent,
            });
          if (successHistoryError) throw successHistoryError;

          const { error: auditError } = await supabase
            .from("audit_logs")
            .insert({
              actor_id: admin.id,
              action: "LOGIN_SUCCESS",
              target_entity: "auth",
              ip_address: ipAddress,
              user_agent: userAgent,
            });
          if (auditError) throw auditError;

          return {
            success: true,
            bypassOtp: true,
            email,
            message: "Sign in successful using trusted device.",
          };
        }
      } catch (error) {
        console.error("[Trusted Device Bypass Error]:", error);
      }
    }

    // Generate plain-text 6-digit code
    const plainOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = hashOtp(plainOtp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Invalidate previous unused OTPs for this admin / email
    try {
      await supabase
        .from("admin_otps")
        .update({ is_used: true })
        .eq("admin_id", admin.id)
        .eq("is_used", false);

      await supabase
        .from("otp_codes")
        .update({ is_used: true })
        .eq("email", email)
        .eq("is_used", false);
    } catch (e) {}

    // Deliver OTP via Resend
    try {
      await sendOtpEmail({
        email,
        adminName: admin.name || "Administrator",
        otp: plainOtp,
        ipAddress,
        browser,
        os,
        loginTime: new Date().toLocaleString(),
      });
    } catch (emailError) {
      console.error("[Resend OTP Email Delivery Error]:", emailError);
      return {
        success: false,
        error: "Unable to send verification email. Please check configuration and try again.",
      };
    }

    // Save hashed OTP in admin_otps & otp_codes
    try {
      await supabase
        .from("admin_otps")
        .insert({
          admin_id: admin.id,
          auth_user_id: admin.auth_user_id || admin.id,
          otp_code: otpHash,
          expires_at: expiresAt,
          is_used: false,
        });

      await supabase
        .from("otp_codes")
        .insert({
          email,
          code: otpHash,
          expires_at: expiresAt,
          is_used: false,
        });

      await supabase
        .from("audit_logs")
        .insert({
          actor_id: admin.id,
          action: "OTP_SENT",
          target_entity: "auth",
          ip_address: ipAddress,
          user_agent: userAgent,
        });
    } catch (dbError) {
      console.warn("[OTP DB Registration Notice]:", dbError);
    }

    return {
      success: true,
      email,
      message: "Security verification code sent to your email.",
    };
  } catch (error) {
    console.error("[requestAdminOtpAction Catch Block]:", error);
    const errObj = error instanceof Error ? error : new Error(String(error));
    return {
      success: false,
      error: `Authentication service error: ${errObj.message}`,
    };
  }
}

export async function verifyAdminOtpAction(
  emailInput: string,
  codeInput: string,
  trustDevice: boolean = false
) {
  const supabase = createAdminClient();

  try {
    const validated = verifySchema.safeParse({ email: emailInput, code: codeInput });
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0]?.message || "Invalid verification input." };
    }

    const { email, code } = validated.data;

    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || null;
    const ipAddress = reqHeaders.get("x-forwarded-for") || reqHeaders.get("x-real-ip") || "127.0.0.1";
    const { browser, os } = parseUserAgent(userAgent);

    const inputHash = hashOtp(code);

    // Get Admin
    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (adminError) {
      console.error("[OTP Verification Admin Query Error]:", adminError);
      return { success: false, error: `Database fetch error: ${adminError.message}` };
    }

    if (!admin) {
      return { success: false, error: "Account verification mismatch." };
    }

    if (admin.is_locked && admin.locked_until && new Date(admin.locked_until) > new Date()) {
      return { success: false, error: "Account is currently locked due to failed attempts. Please try again later." };
    }

    // 1. Check active OTP record in admin_otps table
    let activeOtpId: string | null = null;
    let isFromOtpCodes = false;
    let isMatch = false;

    const { data: otpRecord } = await supabase
      .from("admin_otps")
      .select("*")
      .eq("admin_id", admin.id)
      .eq("is_used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpRecord && otpRecord.otp_code === inputHash) {
      activeOtpId = otpRecord.id;
      isMatch = true;
    }

    // Fallback check in otp_codes table if not matched in admin_otps
    if (!isMatch) {
      const { data: fallbackOtp } = await supabase
        .from("otp_codes")
        .select("*")
        .eq("email", email)
        .eq("is_used", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackOtp && fallbackOtp.code === inputHash) {
        activeOtpId = fallbackOtp.id;
        isFromOtpCodes = true;
        isMatch = true;
      }
    }

    // Development mode helper fallback (enables 123456 dev code in development)
    if (!isMatch && process.env.NODE_ENV === "development" && code === "123456") {
      isMatch = true;
      activeOtpId = "dev-override";
    }

    if (!isMatch || !activeOtpId) {
      const newAdminAttempts = (admin.login_attempts || 0) + 1;
      const shouldLock = newAdminAttempts >= 5;
      const lockedUntil = shouldLock ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

      try {
        await supabase
          .from("admins")
          .update({
            login_attempts: newAdminAttempts,
            is_locked: shouldLock,
            locked_until: lockedUntil,
          })
          .eq("id", admin.id);

        await supabase
          .from("audit_logs")
          .insert({
            actor_id: admin.id,
            action: "OTP_VERIFICATION_FAILURE",
            target_entity: "auth",
            ip_address: ipAddress,
            user_agent: userAgent,
          });
      } catch (logErr) {}

      if (shouldLock) {
        return { success: false, error: "Too many failed attempts. Account locked for 15 minutes." };
      }

      return { success: false, error: `Invalid or expired verification code. ${5 - newAdminAttempts} attempts remaining.` };
    }

    // 2. OTP is valid! Mark OTP as single-use (is_used = true)
    try {
      if (activeOtpId !== "dev-override") {
        if (isFromOtpCodes) {
          await supabase
            .from("otp_codes")
            .update({ is_used: true })
            .eq("id", activeOtpId);
        } else {
          await supabase
            .from("admin_otps")
            .update({ is_used: true })
            .eq("id", activeOtpId);
        }
      }

      await supabase
        .from("audit_logs")
        .insert({
          actor_id: admin.id,
          action: "OTP_VERIFICATION_SUCCESS",
          target_entity: "auth",
          ip_address: ipAddress,
          user_agent: userAgent,
        });
    } catch (e) {}

    // 3. Reset admin login attempts & lockout
    try {
      await supabase
        .from("admins")
        .update({ login_attempts: 0, is_locked: false, locked_until: null })
        .eq("id", admin.id);
    } catch (e) {}

    // Handle Trusted Device for 30 days
    if (trustDevice) {
      const rawDeviceToken = crypto.randomBytes(32).toString("hex");
      const hashedDeviceToken = crypto.createHash("sha256").update(rawDeviceToken).digest("hex");
      const deviceExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { error: deviceError } = await supabase
        .from("trusted_devices")
        .insert({
          admin_id: admin.id,
          device_token: hashedDeviceToken,
          device_name: `${browser} on ${os}`,
          expires_at: deviceExpires,
          ip_address: ipAddress,
          user_agent: userAgent,
        });

      if (deviceError) {
        console.error("[Trusted Device Insertion Error]:", deviceError);
      } else {
        const cookieStore = await cookies();
        cookieStore.set("t2t_trusted_device", rawDeviceToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60,
          path: "/",
        });
      }
    }

    // Create session
    const sessionToken = crypto.randomUUID();
    const hashedSessionToken = crypto.createHash("sha256").update(sessionToken).digest("hex");
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); // 8 hours

    try {
      await supabase
        .from("admin_sessions")
        .insert({
          admin_id: admin.id,
          session_token: hashedSessionToken,
          expires_at: expiresAt,
          ip_address: ipAddress,
          user_agent: userAgent,
        });
    } catch (sessionErr) {
      console.warn("[Admin Session Insert Warning (Pending DB table creation)]:", sessionErr);
    }

    const cookieStore = await cookies();
    cookieStore.set("t2t_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 28800, // 8 hours
      path: "/",
    });

    // Record Login History & Audit Logs
    const { error: historyError } = await supabase
      .from("admin_login_histories")
      .insert({
        admin_id: admin.id,
        status: "SUCCESS",
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    if (historyError) console.error("[Success Login History Insertion Error]:", historyError);

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        actor_id: admin.id,
        action: "LOGIN_SUCCESS",
        target_entity: "auth",
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    if (auditError) console.error("[Success Audit Log Insertion Error]:", auditError);

    return { success: true };
  } catch (error) {
    console.error("[verifyAdminOtpAction Catch Block]:", error);
    const errObj = error instanceof Error ? error : new Error(String(error));
    return { success: false, error: `Verification failed: ${errObj.message}` };
  }
}

export async function resendOtpAction(email: string) {
  return requestAdminOtpAction(email);
}

export async function logoutAdminAction() {
  const supabase = createAdminClient();

  try {
    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || null;
    const ipAddress = reqHeaders.get("x-forwarded-for") || reqHeaders.get("x-real-ip") || "127.0.0.1";
    const { browser, os } = parseUserAgent(userAgent);

    try {
      const { error: auditError } = await supabase
        .from("audit_logs")
        .insert({
          action: "LOGOUT",
          target_entity: "auth",
          ip_address: ipAddress,
          user_agent: userAgent,
        });
      if (auditError) throw auditError;
    } catch (logError) {
      console.error("[Logout Audit Log Error]:", logError);
    }

    const cookieStore = await cookies();
    cookieStore.delete("t2t_session");
    return { success: true };
  } catch (error) {
    console.error("[logoutAdminAction Error]:", error);
    return { success: false };
  }
}

export async function logoutAction() {
  return logoutAdminAction();
}

/**
 * Request Password Reset Action
 * Triggers Supabase resetPasswordForEmail, generates recovery link, and dispatches email via Resend
 */
export async function requestPasswordResetAction(emailInput: string) {
  const supabase = createAdminClient();

  try {
    const emailSchema = z.string().email("Please enter a valid administrator email address");
    const validated = emailSchema.safeParse(emailInput);
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0]?.message || "Invalid email address." };
    }

    const email = validated.data;
    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || null;
    const ipAddress = reqHeaders.get("x-forwarded-for") || reqHeaders.get("x-real-ip") || "127.0.0.1";
    const { browser, os } = parseUserAgent(userAgent);

    // 1. Verify admin exists in admins, profiles, or auth.users
    let { data: admin, error: adminErr } = await supabase
      .from("admins")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (adminErr) {
      console.error("[Password Reset Admin Query Error]:", adminErr);
      return { success: false, error: `Database service error: ${adminErr.message}` };
    }

    if (!admin) {
      // Check profiles fallback
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("email", email)
        .maybeSingle();

      if (profile) {
        admin = {
          id: profile.id,
          email: profile.email,
          name: profile.full_name || "Administrator",
          auth_user_id: profile.id,
        };
      }
    }

    if (!admin) {
      // Check auth.users fallback
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (authUser) {
        admin = {
          id: authUser.id,
          email: authUser.email || email,
          name: (authUser.user_metadata?.full_name as string) || "Administrator",
          auth_user_id: authUser.id,
        };
      }
    }

    if (!admin) {
      return { success: false, error: "No administrator account found with this email address." };
    }

    // 2. Check Rate Limits (max 3 reset requests in 15 minutes)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: resetAttempts } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("event", "PASSWORD_RESET_REQUESTED")
      .eq("ip_address", ipAddress)
      .gte("created_at", fifteenMinsAgo);

    if (resetAttempts !== null && resetAttempts >= 3) {
      return {
        success: false,
        error: "Password reset requests exceeded limit. Please wait 15 minutes before requesting again.",
      };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectTo = `${appUrl}/reset-password`;

    // 3. Invoke Supabase Auth resetPasswordForEmail (anon client call)
    const browserClient = createBrowserClient();
    try {
      await browserClient.auth.resetPasswordForEmail(email, { redirectTo });
    } catch (sbErr) {
      console.warn("⚠️ [Supabase resetPasswordForEmail Notice]:", sbErr);
    }

    // 4. Generate direct recovery link using Admin Service Client for guaranteed delivery
    let resetLink = redirectTo;
    try {
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });

      if (!linkErr && linkData?.properties?.action_link) {
        resetLink = linkData.properties.action_link;
      }
    } catch (genErr) {
      console.warn("⚠️ [GenerateLink Notice]:", genErr);
    }

    // 5. Send transactional email via Resend
    await sendPasswordResetEmail({
      email,
      adminName: admin.name || "Administrator",
      resetLink,
    });

    // 6. Log audit entry
    try {
      await supabase.from("audit_logs").insert({
        actor_id: admin.id || null,
        action: "PASSWORD_RESET_REQUESTED",
        target_entity: "auth",
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    } catch (logErr) {
      console.warn("[Audit Log Insert Notice]:", logErr);
    }

    return {
      success: true,
      message: "Password reset instructions sent to your email address!",
    };
  } catch (error) {
    console.error("[requestPasswordResetAction Error]:", error);
    const errObj = error instanceof Error ? error : new Error(String(error));
    return { success: false, error: `Failed to process password reset: ${errObj.message}` };
  }
}

/**
 * Complete Password Reset Action
 * Sets new password in Supabase Auth & updates bcrypt password in public.admins
 */
export async function completePasswordResetAction({
  email,
  newPassword,
  userId,
}: {
  email?: string;
  newPassword: string;
  userId?: string;
}) {
  const supabase = createAdminClient();

  try {
    const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
    const validated = passwordSchema.safeParse(newPassword);
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0]?.message || "Invalid password." };
    }

    const reqHeaders = await headers();
    const userAgent = reqHeaders.get("user-agent") || null;
    const ipAddress = reqHeaders.get("x-forwarded-for") || reqHeaders.get("x-real-ip") || "127.0.0.1";
    const { browser, os } = parseUserAgent(userAgent);

    let targetUserId = userId;
    let targetEmail = email;

    // Find admin by email or userId
    if (!targetUserId && targetEmail) {
      const { data: admin } = await supabase
        .from("admins")
        .select("id, auth_user_id, email")
        .eq("email", targetEmail)
        .maybeSingle();

      if (admin) {
        targetUserId = admin.auth_user_id || admin.id;
      }
    }

    if (!targetUserId && targetEmail) {
      // Find in auth.users
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const found = authUsers?.users?.find(u => u.email?.toLowerCase() === targetEmail?.toLowerCase());
      if (found) {
        targetUserId = found.id;
      }
    }

    // 1. Update password in Supabase Auth
    if (targetUserId) {
      const { error: sbUpdateErr } = await supabase.auth.admin.updateUserById(targetUserId, {
        password: newPassword,
      });

      if (sbUpdateErr) {
        console.error("[Supabase Admin Password Update Error]:", sbUpdateErr);
      }
    }

    // 2. Hash password with bcrypt and update public.admins table
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    if (targetEmail || targetUserId) {
      let query = supabase.from("admins").update({
        password: hashedPassword,
        login_attempts: 0,
        is_locked: false,
        locked_until: null,
      });

      if (targetEmail) {
        query = query.eq("email", targetEmail);
      } else if (targetUserId) {
        query = query.eq("auth_user_id", targetUserId);
      }

      const { error: adminUpdateErr } = await query;
      if (adminUpdateErr) {
        console.warn("[Admin Table Password Update Warning]:", adminUpdateErr);
      }
    }

    // 3. Log audit entry
    try {
      await supabase.from("audit_logs").insert({
        action: "PASSWORD_RESET_SUCCESS",
        target_entity: "auth",
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    } catch (e) {}

    return {
      success: true,
      message: "Your password has been reset successfully! You can now sign in with your new password.",
    };
  } catch (error) {
    console.error("[completePasswordResetAction Error]:", error);
    const errObj = error instanceof Error ? error : new Error(String(error));
    return { success: false, error: `Failed to reset password: ${errObj.message}` };
  }
}
