import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import {
  renderConfirmationEmail,
  renderPasswordResetEmail,
  renderMagicLinkEmail,
  renderOtpEmail,
  renderAdminInviteEmail,
} from "@/lib/email/templates/auth";

export async function POST(request: Request) {
  try {
    // 1. Verify hook authorization secret if configured
    const hookSecret = process.env.SUPABASE_AUTH_HOOK_SECRET;
    if (hookSecret) {
      const authHeader = request.headers.get("authorization") || request.headers.get("x-supabase-auth-secret");
      if (!authHeader || !authHeader.includes(hookSecret)) {
        return NextResponse.json({ error: "Unauthorized hook invocation" }, { status: 401 });
      }
    }

    const payload = await request.json();
    const { user, email_data } = payload || {};

    if (!user?.email || !email_data) {
      return NextResponse.json({ error: "Missing required user or email_data" }, { status: 400 });
    }

    const recipientEmail = user.email;
    const recipientName = user.user_metadata?.full_name || user.user_metadata?.name || "Valued User";
    const actionType = email_data.email_action_type || email_data.type;
    const token = email_data.token;
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://admin.trash2treasure.co.in";
    const redirectTo = email_data.redirect_to || `${siteUrl}/reset-password`;

    let subject = "Trash2Treasure Authentication Notification";
    let html = "";

    // 2. Select & Render Template based on Supabase Auth Action
    switch (actionType) {
      case "signup":
      case "confirmation": {
        subject = "Confirm your Trash2Treasure account";
        const confirmUrl = `${siteUrl}/auth/confirm?token_hash=${email_data.token_hash}&type=signup&next=${encodeURIComponent(redirectTo)}`;
        html = renderConfirmationEmail(recipientName, confirmUrl);
        break;
      }

      case "recovery":
      case "password_reset": {
        subject = "Reset your Trash2Treasure Admin password";
        const resetUrl = `${redirectTo}?token=${token}&email=${encodeURIComponent(recipientEmail)}`;
        html = renderPasswordResetEmail(recipientName, resetUrl);
        break;
      }

      case "magiclink": {
        subject = "Your Trash2Treasure sign-in link";
        const magicUrl = `${siteUrl}/auth/confirm?token_hash=${email_data.token_hash}&type=magiclink&next=${encodeURIComponent(redirectTo)}`;
        html = renderMagicLinkEmail(recipientName, magicUrl);
        break;
      }

      case "email_otp": {
        subject = `Your Trash2Treasure verification code: ${token}`;
        html = renderOtpEmail(recipientName, token || "000000");
        break;
      }

      case "invite": {
        subject = "Invitation to Trash2Treasure Admin Portal";
        const inviteUrl = `${siteUrl}/auth/confirm?token_hash=${email_data.token_hash}&type=invite&next=${encodeURIComponent(redirectTo)}`;
        html = renderAdminInviteEmail({
          recipientName,
          role: user.user_metadata?.role || "Regional Admin",
          inviteUrl,
        });
        break;
      }

      default: {
        subject = "Trash2Treasure Security Verification";
        html = renderOtpEmail(recipientName, token || "000000");
        break;
      }
    }

    // 3. Dispatch Email via Resend
    const result = await sendEmail({
      to: recipientEmail,
      subject,
      html,
      template: `supabase_auth_${actionType}`,
    });

    if (!result.success) {
      console.error("[Supabase Auth Email Hook Error]:", result.error);
      return NextResponse.json({ error: result.error || "Email dispatch failed" }, { status: 500 });
    }

    return NextResponse.json({ message: "Auth email dispatched successfully" }, { status: 200 });
  } catch (err) {
    console.error("[Supabase Auth Email Hook Catch Error]:", err);
    return NextResponse.json({ error: "Internal server error processing auth hook" }, { status: 500 });
  }
}
