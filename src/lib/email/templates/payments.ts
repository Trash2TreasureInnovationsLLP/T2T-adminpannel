import { renderT2TMasterLayout } from "../layout";

export function renderPaymentReceipt(userName: string, transactionId: string, amount: string, purpose: string, date: string): { subject: string; html: string } {
  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Hello <strong>${userName}</strong>,</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      Your payment for <strong>${purpose}</strong> was successful. Details are below:
    </p>

    <div style="background-color: #0E0E12; border: 1px solid #14EF10; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
      <div style="font-size: 11px; color: #888888; text-transform: uppercase;">Total Paid</div>
      <div style="font-size: 32px; font-weight: 800; color: #14EF10; margin-top: 4px;">${amount}</div>
    </div>
  `;

  return {
    subject: `Payment Receipt (${transactionId})`,
    html: renderT2TMasterLayout({
      title: "Payment Receipt",
      badgeText: "FINANCIAL TRANSACTION",
      bodyHtml: content,
      category: "payments",
      additionalDetails: [
        { label: "Transaction Ref ID", value: transactionId },
        { label: "Payment Purpose", value: purpose },
        { label: "Amount Paid", value: amount },
        { label: "Date & Time", value: date },
        { label: "Status", value: "SUCCESSFUL" },
      ],
    }),
  };
}
