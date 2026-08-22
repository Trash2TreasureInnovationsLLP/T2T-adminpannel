import { renderT2TMasterLayout } from "../layout";

export function renderWasteSubmitted(userName: string, submissionId: string, category: string, weightKg: number): { subject: string; html: string } {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Hello <strong>${userName}</strong>,</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      We have received your waste submission <strong>${submissionId}</strong>. Our regional verification team has recorded your entry.
    </p>
  `;

  return {
    subject: `Waste Submission Recorded (${submissionId})`,
    html: renderT2TMasterLayout({
      title: "Waste Submission Received",
      badgeText: "WASTE MANAGEMENT",
      bodyHtml: content,
      category: "waste",
      additionalDetails: [
        { label: "Submission ID", value: submissionId },
        { label: "Category", value: category },
        { label: "Weight", value: `${weightKg} kg` },
        { label: "Status", value: "Pending Verification" },
      ],
    }),
  };
}

export function renderWasteApproved(userName: string, submissionId: string, category: string, weightKg: number, ecoPoints: number): { subject: string; html: string } {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Great news <strong>${userName}</strong>! 🎉</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      Your waste submission <strong>${submissionId}</strong> has been successfully verified.
    </p>
    <div style="background-color: rgba(20, 239, 16, 0.08); border: 1px solid rgba(20, 239, 16, 0.3); border-radius: 12px; padding: 18px; text-align: center; margin: 16px 0;">
      <div style="font-size: 12px; color: #AAAAAA; font-weight: 600; text-transform: uppercase;">EcoPoints Credited</div>
      <div style="font-size: 34px; font-weight: 800; color: #14EF10; margin-top: 4px;">+${ecoPoints} Points</div>
    </div>
  `;

  return {
    subject: `Your waste submission has been verified (+${ecoPoints} Points)`,
    html: renderT2TMasterLayout({
      title: "Waste Verification Approved",
      badgeText: "VERIFICATION COMPLETED",
      bodyHtml: content,
      category: "waste",
      additionalDetails: [
        { label: "Submission ID", value: submissionId },
        { label: "Category", value: category },
        { label: "Weight", value: `${weightKg} kg` },
        { label: "EcoPoints Earned", value: `+${ecoPoints} Points` },
      ],
      primaryCta: {
        text: "View EcoPoints Balance",
        url: "https://trash2treasure.co.in/rewards",
      },
    }),
  };
}

export function renderWasteRejected(userName: string, submissionId: string, reason: string): { subject: string; html: string } {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Hello <strong>${userName}</strong>,</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      Your waste submission <strong>${submissionId}</strong> could not be verified. Reason provided:
    </p>
    <div style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 10px; padding: 14px; color: #FCA5A5; font-size: 13px; margin: 16px 0;">
      ${reason}
    </div>
  `;

  return {
    subject: `Waste Submission Update: ${submissionId}`,
    html: renderT2TMasterLayout({
      title: "Submission Rejected",
      badgeText: "VERIFICATION UPDATE",
      bodyHtml: content,
      category: "waste",
      primaryCta: {
        text: "Resubmit Waste Item",
        url: "https://trash2treasure.co.in/submit-waste",
      },
    }),
  };
}
