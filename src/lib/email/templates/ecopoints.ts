import { renderT2TMasterLayout } from "../layout";

export function renderEcoPointsCredited(userName: string, pointsAmount: number, reason: string): { subject: string; html: string } {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Hello <strong>${userName}</strong>,</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      Your EcoPoints balance has been credited. Reason: <strong>${reason}</strong>.
    </p>

    <div style="background-color: rgba(20, 239, 16, 0.08); border: 1px solid rgba(20, 239, 16, 0.3); border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
      <div style="font-size: 12px; color: #AAAAAA; font-weight: 600; text-transform: uppercase;">Points Added</div>
      <div style="font-size: 36px; font-weight: 800; color: #14EF10; margin-top: 4px;">+${pointsAmount} EcoPoints</div>
    </div>
  `;

  return {
    subject: `+${pointsAmount} EcoPoints Credited to Your Account`,
    html: renderT2TMasterLayout({
      title: "EcoPoints Credited",
      badgeText: "ECOPOINTS NETWORK",
      bodyHtml: content,
      category: "ecopoints",
      primaryCta: {
        text: "Redeem Rewards",
        url: "https://trash2treasure.co.in/rewards",
      },
    }),
  };
}
