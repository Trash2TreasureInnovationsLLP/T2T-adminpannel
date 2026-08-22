import { renderT2TMasterLayout } from "../layout";

export function renderUserWelcome(userName: string): { subject: string; html: string } {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Welcome to Trash2Treasure, <strong>${userName}</strong>! 🌱</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      Thank you for joining India's dedicated eco-reward network. You can now deposit recyclable waste, earn EcoPoints, and redeem partner coupons.
    </p>
  `;

  return {
    subject: "Welcome to Trash2Treasure!",
    html: renderT2TMasterLayout({
      title: "Welcome to Trash2Treasure!",
      badgeText: "ACCOUNT CREATED",
      bodyHtml: content,
      category: "users",
      primaryCta: {
        text: "Open User Portal",
        url: "https://trash2treasure.co.in",
      },
    }),
  };
}

export function renderProfileUpdated(userName: string, changes: string[]): { subject: string; html: string } {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Hello <strong>${userName}</strong>,</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      Your Trash2Treasure profile information was updated. Modified fields: <strong>${changes.join(", ")}</strong>.
    </p>
  `;

  return {
    subject: "Trash2Treasure Profile Updated",
    html: renderT2TMasterLayout({
      title: "Profile Updated",
      badgeText: "ACCOUNT NOTIFICATION",
      bodyHtml: content,
      category: "users",
      securityNotice: "If you did not perform this update, please change your password and notify support immediately.",
    }),
  };
}

export function renderUserSecurityAlert(userName: string, alertDetail: string, ipAddress?: string): { subject: string; html: string } {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Hello <strong>${userName}</strong>,</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      Security event detected on your account: <strong>${alertDetail}</strong>.
    </p>
  `;

  return {
    subject: "Security Alert: Account Activity Detected",
    html: renderT2TMasterLayout({
      title: "Security Notice",
      badgeText: "SECURITY ALERT",
      bodyHtml: content,
      category: "users",
      additionalDetails: ipAddress ? [{ label: "IP Address", value: ipAddress }] : undefined,
      securityNotice: "If this action was not initiated by you, please reset your password immediately.",
    }),
  };
}
