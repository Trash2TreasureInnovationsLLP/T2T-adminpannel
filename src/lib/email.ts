import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const DEFAULT_SENDER = process.env.EMAIL_FROM || "Trash2Treasure Security <auth@trash2treasure.co.in>";

/**
 * Sends a 6-digit administrator verification OTP email.
 */
export async function sendOtpEmail({
  email,
  adminName,
  otp,
  ipAddress,
  browser,
  os,
  loginTime,
}: {
  email: string;
  adminName: string;
  otp: string;
  ipAddress: string;
  browser: string;
  os: string;
  loginTime: string;
}) {
  const sender = DEFAULT_SENDER;
  const subject = `Your T2T Admin Verification Code: ${otp}`;

  // Log prominently to terminal console
  console.log(`\n==================================================`);
  console.log(`🔑 [T2T ADMIN OTP VERIFICATION CODE]`);
  console.log(`Target Email : ${email}`);
  console.log(`Admin Name   : ${adminName}`);
  console.log(`👉 OTP CODE  : ${otp}`);
  console.log(`Sender       : ${sender}`);
  console.log(`==================================================\n`);

  if (resend) {
    try {
      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; background-color: #0A0A0C; border: 1px solid #222226; border-radius: 16px; color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; padding: 8px 16px; background-color: rgba(20, 239, 16, 0.1); border: 1px solid rgba(20, 239, 16, 0.3); border-radius: 9999px; margin-bottom: 12px;">
              <span style="color: #14EF10; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">TRASH2TREASURE ADMIN SECURITY</span>
            </div>
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Two-Factor Authentication</h1>
            <p style="color: #888888; font-size: 13px; margin: 6px 0 0 0;">Enter this one-time passcode to verify your administrator identity.</p>
          </div>

          <div style="background-color: #121216; border: 1px solid #222226; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="color: #cccccc; font-size: 14px; margin: 0 0 12px 0;">Hello <strong>${adminName}</strong>,</p>
            <p style="color: #999999; font-size: 13px; margin: 0 0 16px 0;">Your single-use 6-digit login verification code is:</p>
            
            <div style="background: linear-gradient(180deg, #161a14 0%, #0d120c 100%); border: 1px solid rgba(20, 239, 16, 0.4); border-radius: 12px; font-size: 36px; font-weight: 800; color: #14EF10; letter-spacing: 8px; text-align: center; padding: 20px; margin: 0; box-shadow: inset 0 0 20px rgba(20, 239, 16, 0.15);">
              ${otp}
            </div>
            
            <p style="color: #777777; font-size: 12px; text-align: center; margin: 12px 0 0 0;">
              This code will expire in <strong>5 minutes</strong>. Do not share this code with anyone.
            </p>
          </div>

          <div style="background-color: #0e0e12; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 12px; color: #777777; line-height: 1.6;">
            <div><strong>Request Details:</strong></div>
            <div>• IP Address: <code style="color: #aaaaaa;">${ipAddress}</code></div>
            <div>• Device: <span style="color: #aaaaaa;">${browser} on ${os}</span></div>
            <div>• Time: <span style="color: #aaaaaa;">${loginTime}</span></div>
          </div>

          <hr style="border: 0; border-top: 1px solid #1f1f24; margin: 24px 0 16px 0;" />
          <p style="color: #555555; font-size: 11px; text-align: center; margin: 0; line-height: 1.5;">
            If you did not attempt to sign in to your Trash2Treasure Admin account, please lock your account or contact security immediately.
          </p>
        </div>
      `;

      const res = await resend.emails.send({
        from: sender,
        to: email,
        subject,
        html: htmlContent,
      });
      console.log(`[Resend OTP Sent] to ${email} (ID: ${res.data?.id})`);
    } catch (resendErr) {
      console.warn(
        `[Resend Email Warning]:`,
        resendErr instanceof Error ? resendErr.message : resendErr
      );
    }
  }

  return { success: true };
}

/**
 * Sends a password reset link email to an administrator.
 */
export async function sendPasswordResetEmail({
  email,
  adminName,
  resetLink,
  ipAddress,
  browser,
  os,
  expiresMinutes = 30,
}: {
  email: string;
  adminName: string;
  resetLink: string;
  ipAddress?: string;
  browser?: string;
  os?: string;
  expiresMinutes?: number;
}) {
  const sender = DEFAULT_SENDER;
  const subject = "Reset Your T2T Admin Password";

  console.log(`\n==================================================`);
  console.log(`🔑 [T2T ADMIN PASSWORD RESET LINK]`);
  console.log(`Target Email : ${email}`);
  console.log(`Admin Name   : ${adminName}`);
  console.log(`👉 RESET LINK : ${resetLink}`);
  console.log(`Expires In   : ${expiresMinutes} minutes`);
  console.log(`Sender       : ${sender}`);
  console.log(`==================================================\n`);

  if (resend) {
    try {
      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; background-color: #0A0A0C; border: 1px solid #222226; border-radius: 16px; color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; padding: 8px 16px; background-color: rgba(20, 239, 16, 0.1); border: 1px solid rgba(20, 239, 16, 0.3); border-radius: 9999px; margin-bottom: 12px;">
              <span style="color: #14EF10; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">TRASH2TREASURE ADMIN SECURITY</span>
            </div>
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Password Reset Request</h1>
            <p style="color: #888888; font-size: 13px; margin: 6px 0 0 0;">Administrator Account Security Recovery</p>
          </div>

          <div style="background-color: #121216; border: 1px solid #222226; border-radius: 12px; padding: 22px; margin-bottom: 24px;">
            <p style="color: #cccccc; font-size: 14px; margin: 0 0 12px 0;">Hello <strong>${adminName}</strong>,</p>
            <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 20px 0;">
              We received a request to reset the password for your administrator account (<code style="color: #14EF10; background: #000; padding: 2px 6px; border-radius: 4px;">${email}</code>).
            </p>

            <div style="text-align: center; margin: 28px 0;">
              <a href="${resetLink}" style="background-color: #14EF10; color: #000000; font-weight: 800; text-decoration: none; padding: 15px 32px; border-radius: 12px; display: inline-block; font-size: 15px; letter-spacing: 0.2px; box-shadow: 0 0 24px rgba(20, 239, 16, 0.4); text-transform: uppercase;">
                Set New Password
              </a>
            </div>

            <p style="color: #777777; font-size: 12px; line-height: 1.6; margin: 0;">
              This link is secure and will remain valid for <strong>${expiresMinutes} minutes</strong>. If you did not make this request, you can safely ignore this email.
            </p>
          </div>

          <div style="background-color: #0e0e12; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; font-size: 12px; color: #777777; line-height: 1.6;">
            <div style="margin-bottom: 6px;"><strong>Direct URL:</strong></div>
            <a href="${resetLink}" style="color: #14EF10; font-size: 11px; word-break: break-all; text-decoration: underline;">
              ${resetLink}
            </a>
            ${ipAddress ? `<div style="margin-top: 10px; color: #666;">Requested from IP <code style="color: #888;">${ipAddress}</code> (${browser || "Browser"} on ${os || "OS"})</div>` : ""}
          </div>

          <hr style="border: 0; border-top: 1px solid #1f1f24; margin: 24px 0 16px 0;" />
          <p style="color: #555555; font-size: 11px; text-align: center; margin: 0; line-height: 1.5;">
            Trash2Treasure Ecosystem Governance & Operations Management • Automated Security Dispatch
          </p>
        </div>
      `;

      const res = await resend.emails.send({
        from: sender,
        to: email,
        subject,
        html: htmlContent,
      });
      console.log(`[Resend Password Reset Email Sent] to ${email} (ID: ${res.data?.id})`);
    } catch (resendErr) {
      console.warn(
        `[Resend Password Reset Warning]:`,
        resendErr instanceof Error ? resendErr.message : resendErr
      );
    }
  }

  return { success: true };
}

/**
 * Sends a confirmation email after an admin's password has been successfully reset.
 */
export async function sendPasswordChangedEmail({
  email,
  adminName,
  ipAddress,
  browser,
  os,
  timestamp,
}: {
  email: string;
  adminName: string;
  ipAddress: string;
  browser: string;
  os: string;
  timestamp: string;
}) {
  const sender = DEFAULT_SENDER;
  const subject = "Security Alert: T2T Admin Password Changed";

  if (resend) {
    try {
      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; background-color: #0A0A0C; border: 1px solid #222226; border-radius: 16px; color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; padding: 8px 16px; background-color: rgba(20, 239, 16, 0.1); border: 1px solid rgba(20, 239, 16, 0.3); border-radius: 9999px; margin-bottom: 12px;">
              <span style="color: #14EF10; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">TRASH2TREASURE ADMIN SECURITY</span>
            </div>
            <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0;">Password Successfully Changed</h1>
          </div>

          <div style="background-color: #121216; border: 1px solid #222226; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="color: #cccccc; font-size: 14px; margin: 0 0 12px 0;">Hello <strong>${adminName}</strong>,</p>
            <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0;">
              The password for your administrator account (<code style="color: #14EF10;">${email}</code>) was successfully updated on <strong>${timestamp}</strong>.
            </p>
          </div>

          <div style="background-color: #0e0e12; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #777777; line-height: 1.6;">
            <div>• IP Address: <code style="color: #aaaaaa;">${ipAddress}</code></div>
            <div>• Device: <span style="color: #aaaaaa;">${browser} on ${os}</span></div>
          </div>

          <hr style="border: 0; border-top: 1px solid #1f1f24; margin: 24px 0 16px 0;" />
          <p style="color: #555555; font-size: 11px; text-align: center; margin: 0;">
            If you did not perform this password change, please contact system administration immediately.
          </p>
        </div>
      `;

      await resend.emails.send({
        from: sender,
        to: email,
        subject,
        html: htmlContent,
      });
    } catch (resendErr) {
      console.warn(
        `[Resend Password Changed Alert Warning]:`,
        resendErr instanceof Error ? resendErr.message : resendErr
      );
    }
  }

  return { success: true };
}

/**
 * Generic email dispatcher.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}) {
  try {
    const sender = from || DEFAULT_SENDER;
    if (resend) {
      const recipient = Array.isArray(to) ? to : [to];
      await resend.emails.send({
        from: sender,
        to: recipient,
        subject,
        html,
        text,
      });
      console.log(`[Resend Email Delivered] Sent to ${recipient.join(", ")}`);
    } else {
      console.log(`\n==================================================`);
      console.log(`[EMAIL SEND SIMULATOR]`);
      console.log(`From: ${sender}`);
      console.log(`To: ${Array.isArray(to) ? to.join(", ") : to}`);
      console.log(`Subject: ${subject}`);
      console.log(`==================================================\n`);
    }
    return { success: true };
  } catch (error) {
    console.warn("[sendEmail Warning]:", error);
    return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}
