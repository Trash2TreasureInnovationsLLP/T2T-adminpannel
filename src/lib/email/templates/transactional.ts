import { renderT2TEmailLayout } from "./base";

export function renderWelcomeEmail(userName: string): string {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Welcome to Trash2Treasure, <strong>${userName}</strong>! 🌱</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      You are now part of India's leading sustainable waste management network. Start recycling plastic, paper, e-waste, and metal to earn EcoPoints redeemable for exclusive rewards.
    </p>
    <div style="background-color: #0E0E12; border: 1px solid #1F1F24; border-radius: 10px; padding: 16px; margin: 16px 0;">
      <div style="font-weight: 700; color: #14EF10; margin-bottom: 8px;">Getting Started Steps:</div>
      <div style="color: #CCCCCC; font-size: 13px; line-height: 1.8;">
        1. Drop waste at nearest smart bin or request a doorstep pickup.<br />
        2. Upload submission photo & receive verified EcoPoints.<br />
        3. Redeem coupons & partner discounts in the App.
      </div>
    </div>
  `;

  return renderT2TEmailLayout({
    title: "Welcome to Trash2Treasure!",
    badgeText: "ECO-REWARD NETWORK",
    bodyContent: content,
    ctaButton: {
      text: "Open User Portal",
      url: "https://trash2treasure.co.in",
    },
  });
}

export function renderWasteSubmissionReceivedEmail(userName: string, submissionId: string, category: string, weightKg: number): string {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Hello <strong>${userName}</strong>,</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      We have received your waste submission. Our regional verification team is reviewing your entry.
    </p>
  `;

  return renderT2TEmailLayout({
    title: "Waste Submission Received",
    badgeText: "SUBMISSION RECORDED",
    bodyContent: content,
    requestDetails: [
      { label: "Submission ID", value: submissionId },
      { label: "Category", value: category },
      { label: "Estimated Weight", value: `${weightKg} kg` },
      { label: "Status", value: "Pending Verification" },
    ],
  });
}

export function renderWasteSubmissionApprovedEmail(userName: string, submissionId: string, pointsAwarded: number): string {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Great news, <strong>${userName}</strong>! 🎉</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      Your waste submission <strong>${submissionId}</strong> has been verified and approved.
    </p>
    <div style="background-color: rgba(20, 239, 16, 0.08); border: 1px solid rgba(20, 239, 16, 0.3); border-radius: 12px; padding: 18px; text-align: center; margin: 16px 0;">
      <div style="font-size: 12px; color: #AAAAAA; font-weight: 600; text-transform: uppercase;">EcoPoints Credited</div>
      <div style="font-size: 32px; font-weight: 800; color: #14EF10; margin-top: 4px;">+${pointsAwarded} Points</div>
    </div>
  `;

  return renderT2TEmailLayout({
    title: "Waste Submission Approved",
    badgeText: "POINTS CREDITED",
    bodyContent: content,
    ctaButton: {
      text: "View EcoPoints Balance",
      url: "https://trash2treasure.co.in/dashboard",
    },
  });
}

export function renderRewardRedeemedEmail(userName: string, rewardTitle: string, couponCode: string, expiryDate?: string): string {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Congratulations <strong>${userName}</strong>!</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      You have successfully redeemed <strong>${rewardTitle}</strong>. Here is your voucher code:
    </p>

    <div style="background-color: #0E0E12; border: 1.5px dashed #14EF10; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
      <div style="font-size: 11px; color: #888888; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Voucher Coupon Code</div>
      <div style="font-size: 28px; font-weight: 800; color: #14EF10; font-mono; letter-spacing: 4px; margin-top: 6px;">${couponCode}</div>
      ${expiryDate ? `<div style="font-size: 11px; color: #AAAAAA; margin-top: 8px;">Valid until ${expiryDate}</div>` : ""}
    </div>
  `;

  return renderT2TEmailLayout({
    title: "Reward Redeemed!",
    badgeText: "REWARD VOUCHER",
    bodyContent: content,
  });
}

export function renderPickupRequestStatusEmail(userName: string, requestId: string, status: "created" | "confirmed" | "completed", scheduledDate?: string): string {
  const titles = {
    created: "Pickup Request Scheduled",
    confirmed: "Pickup Confirmed by Collector",
    completed: "Doorstep Pickup Completed",
  };

  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Hello <strong>${userName}</strong>,</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      Your doorstep waste pickup request <strong>${requestId}</strong> is currently <strong>${status.toUpperCase()}</strong>.
    </p>
  `;

  return renderT2TEmailLayout({
    title: titles[status],
    badgeText: "PICKUP SERVICE",
    bodyContent: content,
    requestDetails: [
      { label: "Request ID", value: requestId },
      { label: "Current Status", value: status.toUpperCase() },
      ...(scheduledDate ? [{ label: "Scheduled Slot", value: scheduledDate }] : []),
    ],
  });
}
