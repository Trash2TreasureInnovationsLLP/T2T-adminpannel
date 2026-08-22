import { renderT2TEmailLayout } from "./base";

export function renderPasswordResetEmail(recipientName: string, resetUrl: string, expiresMinutes = 30): string {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Hello <strong>${recipientName}</strong>,</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 20px 0;">
      We received a request to reset your Trash2Treasure account password. Click the button below to establish a new password securely.
    </p>
  `;

  return renderT2TEmailLayout({
    title: "Reset Admin Password",
    badgeText: "TRASH2TREASURE ADMIN SECURITY",
    bodyContent: content,
    ctaButton: {
      text: "Reset Password",
      url: resetUrl,
    },
    securityNotice: `If you did not request this password reset, you can safely ignore this email. This link will expire in ${expiresMinutes} minutes. Never share this link with anyone.`,
  });
}

export function renderOtpEmail(recipientName: string, otpCode: string, expiresMinutes = 5): string {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Hello <strong>${recipientName}</strong>,</p>
    <p style="color: #999999; font-size: 13px; margin: 0 0 16px 0;">Your single-use 6-digit verification code is:</p>

    <div style="background: linear-gradient(180deg, #161a14 0%, #0d120c 100%); border: 1px solid rgba(20, 239, 16, 0.4); border-radius: 12px; font-size: 38px; font-weight: 800; color: #14EF10; letter-spacing: 10px; text-align: center; padding: 22px; margin: 0 0 16px 0; box-shadow: inset 0 0 20px rgba(20, 239, 16, 0.15);">
      ${otpCode}
    </div>

    <p style="color: #777777; font-size: 12px; text-align: center; margin: 0;">
      This code is valid for <strong>${expiresMinutes} minutes</strong>.
    </p>
  `;

  return renderT2TEmailLayout({
    title: "Your Verification Code",
    badgeText: "TRASH2TREASURE AUTHENTICATION",
    bodyContent: content,
    securityNotice: "Never share this code with anyone. Trash2Treasure representatives will never ask for your verification code.",
  });
}

export function renderConfirmationEmail(recipientName: string, confirmationUrl: string): string {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Welcome to Trash2Treasure, <strong>${recipientName}</strong>!</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 20px 0;">
      Thank you for creating an account on Trash2Treasure. Please confirm your email address to activate your account and access eco-reward features.
    </p>
  `;

  return renderT2TEmailLayout({
    title: "Confirm Your Email Address",
    badgeText: "ACCOUNT VERIFICATION",
    bodyContent: content,
    ctaButton: {
      text: "Confirm Account",
      url: confirmationUrl,
    },
    securityNotice: "If you did not sign up for a Trash2Treasure account, no action is required.",
  });
}

export function renderMagicLinkEmail(recipientName: string, magicLinkUrl: string): string {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Hello <strong>${recipientName}</strong>,</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 20px 0;">
      Click the button below to sign in securely to your Trash2Treasure account without typing a password.
    </p>
  `;

  return renderT2TEmailLayout({
    title: "Your Sign-In Link",
    badgeText: "MAGIC LINK SIGN-IN",
    bodyContent: content,
    ctaButton: {
      text: "Sign In Securely",
      url: magicLinkUrl,
    },
    securityNotice: "This link can only be used once and expires shortly. If you did not request a sign-in link, ignore this email.",
  });
}

export function renderAdminInviteEmail(params: {
  recipientName: string;
  role: string;
  organizationName?: string;
  inviteUrl: string;
  inviterName?: string;
}): string {
  const orgText = params.organizationName ? ` in <strong>${params.organizationName}</strong>` : "";
  const inviterText = params.inviterName ? ` by ${params.inviterName}` : "";

  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Hello <strong>${params.recipientName}</strong>,</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      You have been invited${inviterText} to join the Trash2Treasure Admin Operations Portal${orgText} as a <strong>${params.role}</strong>.
    </p>
    <div style="background-color: #0E0E12; border-left: 3px solid #14EF10; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #BBBBBB;">
      <strong>Assigned Role:</strong> <span style="color: #14EF10;">${params.role}</span>
    </div>
  `;

  return renderT2TEmailLayout({
    title: "Admin Portal Invitation",
    badgeText: "T2T GOVERNANCE & OPERATIONS",
    bodyContent: content,
    ctaButton: {
      text: "Accept Invitation",
      url: params.inviteUrl,
    },
    securityNotice: "Never send passwords via email. Clicking the link above will allow you to securely set up your administrator credentials.",
  });
}

export function renderPasswordChangedEmail(recipientName: string, timestamp: string, ipAddress?: string): string {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Hello <strong>${recipientName}</strong>,</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      This is a security alert to inform you that the password for your Trash2Treasure account was updated on <strong>${timestamp}</strong>.
    </p>
    ${ipAddress ? `<p style="color: #777777; font-size: 12px;">Requested from IP Address: <code style="color: #14EF10;">${ipAddress}</code></p>` : ""}
  `;

  return renderT2TEmailLayout({
    title: "Password Changed Alert",
    badgeText: "SECURITY ALERT",
    bodyContent: content,
    securityNotice: "If you did not authorize this password change, please contact Trash2Treasure Security Support immediately.",
  });
}
