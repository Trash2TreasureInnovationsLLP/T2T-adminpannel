import { renderT2TEmailLayout } from "./base";

export function renderAdminAlertEmail(params: {
  adminName: string;
  alertTitle: string;
  alertCategory: "SECURITY" | "OPERATIONS" | "SYSTEM" | "FINANCIAL";
  message: string;
  details?: Array<{ label: string; value: string }>;
  actionUrl?: string;
  actionText?: string;
}): string {
  const badgeColors = {
    SECURITY: "CRITICAL SECURITY ALERT",
    OPERATIONS: "OPERATIONAL ALERT",
    SYSTEM: "SYSTEM HEALTH ALERT",
    FINANCIAL: "FINANCIAL ALERT",
  };

  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Attention <strong>${params.adminName}</strong>,</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      ${params.message}
    </p>
  `;

  return renderT2TEmailLayout({
    title: params.alertTitle,
    badgeText: badgeColors[params.alertCategory] || "ADMIN ALERT",
    bodyContent: content,
    requestDetails: params.details,
    ctaButton: params.actionUrl
      ? {
          text: params.actionText || "Review in Admin Portal",
          url: params.actionUrl,
        }
      : undefined,
  });
}
