import { renderT2TMasterLayout } from "../layout";

export function renderRewardRedeemed(userName: string, rewardTitle: string, couponCode: string, expiryDate?: string): { subject: string; html: string } {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Congratulations <strong>${userName}</strong>!</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      You have successfully redeemed <strong>${rewardTitle}</strong>. Here is your unique partner voucher code:
    </p>

    <div style="background-color: #0E0E12; border: 1.5px dashed #14EF10; border-radius: 12px; padding: 22px; text-align: center; margin: 20px 0;">
      <div style="font-size: 11px; color: #888888; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Voucher Code</div>
      <div style="font-size: 30px; font-weight: 800; color: #14EF10; font-family: monospace; letter-spacing: 5px; margin-top: 6px;">${couponCode}</div>
      ${expiryDate ? `<div style="font-size: 11px; color: #AAAAAA; margin-top: 8px;">Valid until ${expiryDate}</div>` : ""}
    </div>
  `;

  return {
    subject: `Your Reward Voucher Code: ${couponCode}`,
    html: renderT2TMasterLayout({
      title: "Reward Voucher Delivered",
      badgeText: "REWARDS STORE",
      bodyHtml: content,
      category: "rewards",
      additionalDetails: [
        { label: "Reward Item", value: rewardTitle },
        { label: "Coupon Code", value: couponCode },
        ...(expiryDate ? [{ label: "Expires On", value: expiryDate }] : []),
      ],
    }),
  };
}

export function renderCouponExpiring(userName: string, rewardTitle: string, couponCode: string, daysLeft: number): { subject: string; html: string } {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Reminder for <strong>${userName}</strong>,</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      Your coupon code for <strong>${rewardTitle}</strong> will expire in <strong>${daysLeft} days</strong>.
    </p>
    <div style="background-color: #0E0E12; border: 1px solid #EAB308; border-radius: 10px; padding: 16px; font-family: monospace; font-size: 20px; color: #EAB308; text-align: center;">
      ${couponCode}
    </div>
  `;

  return {
    subject: `Coupon Expiring Soon: ${rewardTitle}`,
    html: renderT2TMasterLayout({
      title: "Coupon Expiring Soon",
      badgeText: "REWARD REMINDER",
      bodyHtml: content,
      category: "rewards",
    }),
  };
}
