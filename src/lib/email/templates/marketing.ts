import { renderT2TMasterLayout } from "../layout";

export function renderMarketingCampaign(userName: string, campaignTitle: string, messageBodyHtml: string, cta?: { text: string; url: string }, unsubscribeUrl?: string): { subject: string; html: string } {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Hello <strong>${userName}</strong>,</p>
    <div style="color: #999999; font-size: 13px; line-height: 1.6;">
      ${messageBodyHtml}
    </div>
  `;

  return {
    subject: campaignTitle,
    html: renderT2TMasterLayout({
      title: campaignTitle,
      badgeText: "T2T SUSTAINABILITY CAMPAIGN",
      bodyHtml: content,
      category: "marketing",
      primaryCta: cta,
      unsubscribeUrl: unsubscribeUrl || "https://trash2treasure.co.in/unsubscribe",
    }),
  };
}
