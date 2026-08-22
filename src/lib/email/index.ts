import { emailService } from "./service";
import { SendEmailOptions, SendEmailResult } from "./types";

export * from "./types";
export * from "./provider";
export * from "./layout";
export * from "./service";
export * from "./routing";
export * from "./idempotency";
export * from "./recipients";

const DEFAULT_SENDER =
  process.env.EMAIL_FROM_EMAIL ||
  "Trash2Treasure <noreply@trash2treasure.co.in>";

const ADMIN_SENDER = process.env.ADMIN_NOTIFICATIONS_EMAIL || "Trash2Treasure Admin <admin@trash2treasure.co.in>";
const SUPPORT_SENDER = process.env.SUPPORT_EMAIL || "Trash2Treasure Support <support@trash2treasure.co.in>";

/**
 * Primary unified email dispatcher function.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  return emailService.send({
    template: options.template || "generic",
    to: options.to,
    data: {
      subject: options.subject,
      html: options.html,
      message: options.html,
      ...options.metadata,
    },
    idempotencyKey: options.idempotencyKey,
    eventId: options.eventId,
    category: options.category,
    replyTo: options.replyTo,
  });
}

/**
 * Dispatches authentication emails (Password Reset, OTP, Confirmation, Magic Link, Invites).
 */
export async function sendAuthEmail(
  type: "reset_password" | "otp" | "confirm_signup" | "magic_link" | "invite_admin" | "password_changed",
  to: string,
  data: {
    recipientName?: string;
    resetUrl?: string;
    otpCode?: string;
    confirmationUrl?: string;
    magicLinkUrl?: string;
    inviteUrl?: string;
    role?: string;
    ipAddress?: string;
    browser?: string;
    os?: string;
    loginTime?: string;
    timestamp?: string;
  }
): Promise<SendEmailResult> {
  return emailService.send({
    template: `auth.${type === "reset_password" ? "reset_password" : type === "confirm_signup" ? "confirm" : type === "magic_link" ? "magic_link" : type}`,
    to,
    data,
    category: "auth",
  });
}

/**
 * Dispatches transactional user emails (Welcome, Waste Approval, Rewards, Pickups).
 */
export async function sendTransactionalEmail(
  template: "welcome" | "waste_received" | "waste_approved" | "reward_redeemed" | "pickup_status",
  to: string,
  data: Record<string, any>
): Promise<SendEmailResult> {
  const templateMap: Record<string, string> = {
    welcome: "users.welcome",
    waste_received: "waste.submitted",
    waste_approved: "waste.approved",
    reward_redeemed: "rewards.redeemed",
    pickup_status: "pickups.update",
  };

  return emailService.send({
    template: templateMap[template] || "users.welcome",
    to,
    data,
  });
}

/**
 * Dispatches operational emails to administrators.
 */
export async function sendAdminEmail(
  alertTitle: string,
  to: string | string[],
  params: {
    adminName?: string;
    alertCategory: "SECURITY" | "OPERATIONS" | "SYSTEM" | "FINANCIAL";
    message: string;
    details?: Array<{ label: string; value: string }>;
    actionUrl?: string;
  }
): Promise<SendEmailResult> {
  return emailService.send({
    template: "admin.alert",
    to,
    data: {
      alertTitle,
      ...params,
    },
    category: "admin",
  });
}

/**
 * Dispatches generic notification emails.
 */
export async function sendNotificationEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject,
    html: htmlContent,
    from: DEFAULT_SENDER,
    category: "users",
  });
}

// ============================================================================
// LEGACY COMPATIBILITY HELPERS FOR EXISTING AUTH ACTIONS
// ============================================================================

export async function sendOtpEmail(params: {
  email: string;
  adminName: string;
  otp: string;
  ipAddress: string;
  browser: string;
  os: string;
  loginTime: string;
}): Promise<{ success: boolean }> {
  const result = await sendAuthEmail("otp", params.email, {
    recipientName: params.adminName,
    otpCode: params.otp,
    ipAddress: params.ipAddress,
    browser: params.browser,
    os: params.os,
    loginTime: params.loginTime,
  });
  return { success: result.success };
}

export async function sendPasswordResetEmail(params: {
  email: string;
  adminName: string;
  resetLink: string;
  ipAddress?: string;
  browser?: string;
  os?: string;
  expiresMinutes?: number;
}): Promise<{ success: boolean }> {
  const result = await sendAuthEmail("reset_password", params.email, {
    recipientName: params.adminName,
    resetUrl: params.resetLink,
    ipAddress: params.ipAddress,
  });
  return { success: result.success };
}

export async function sendPasswordChangedEmail(params: {
  email: string;
  adminName: string;
  ipAddress: string;
  browser: string;
  os: string;
  timestamp: string;
}): Promise<{ success: boolean }> {
  const result = await sendAuthEmail("password_changed", params.email, {
    recipientName: params.adminName,
    timestamp: params.timestamp,
    ipAddress: params.ipAddress,
  });
  return { success: result.success };
}
