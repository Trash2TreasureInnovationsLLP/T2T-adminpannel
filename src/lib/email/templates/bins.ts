import { renderT2TMasterLayout } from "../layout";

export function renderBinReportEmail(userName: string, binId: string, issueType: string, location: string): { subject: string; html: string } {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Hello <strong>${userName}</strong>,</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      Thank you for submitting a smart bin report. Our municipal field team has received your notice regarding <strong>Bin ID: ${binId}</strong>.
    </p>
  `;

  return {
    subject: `Bin Report Received (${binId})`,
    html: renderT2TMasterLayout({
      title: "Bin Report Acknowledgement",
      badgeText: "MUNICIPAL SMART BINS",
      bodyHtml: content,
      category: "bins",
      additionalDetails: [
        { label: "Smart Bin ID", value: binId },
        { label: "Issue Type", value: issueType },
        { label: "Bin Location", value: location },
      ],
    }),
  };
}
