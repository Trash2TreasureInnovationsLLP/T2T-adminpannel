import { renderT2TMasterLayout } from "../layout";

export function renderSystemAlert(
  title: string,
  message: string,
  severity: "INFO" | "WARNING" | "CRITICAL"
): { subject: string; html: string } {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">System Notice:</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      ${message}
    </p>
  `;

  return {
    subject: `[System ${severity}] ${title}`,
    html: renderT2TMasterLayout({
      title,
      badgeText: `SYSTEM ${severity}`,
      bodyHtml: content,
      category: "system",
      securityNotice: severity === "CRITICAL" ? "Administrative investigation required." : undefined,
    }),
  };
}
