import { renderT2TMasterLayout } from "../layout";

export function renderPickupUpdate(
  userName: string,
  requestId: string,
  status: "requested" | "confirmed" | "assigned" | "scheduled" | "reminder" | "completed" | "failed",
  details: { date?: string; address?: string; collectorName?: string }
): { subject: string; html: string } {
  const titles = {
    requested: "Doorstep Pickup Requested",
    confirmed: "Pickup Request Confirmed",
    assigned: "Collector Assigned to Your Pickup",
    scheduled: "Pickup Date & Time Scheduled",
    reminder: "Pickup Reminder: Arriving Today",
    completed: "Doorstep Pickup Completed",
    failed: "Pickup Delivery Unsuccessful",
  };

  const content = `
    <p style="color: #CCCCCC; font-size: 14px; margin: 0 0 12px 0;">Hello <strong>${userName}</strong>,</p>
    <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
      Your doorstep waste collection request <strong>${requestId}</strong> is currently <strong>${status.toUpperCase()}</strong>.
    </p>
  `;

  return {
    subject: `Pickup Update (${requestId}): ${titles[status]}`,
    html: renderT2TMasterLayout({
      title: titles[status],
      badgeText: "DOORSTEP PICKUP SERVICE",
      bodyHtml: content,
      category: "pickups",
      additionalDetails: [
        { label: "Pickup ID", value: requestId },
        { label: "Status", value: status.toUpperCase() },
        ...(details.date ? [{ label: "Scheduled Slot", value: details.date }] : []),
        ...(details.address ? [{ label: "Address", value: details.address }] : []),
        ...(details.collectorName ? [{ label: "Assigned Collector", value: details.collectorName }] : []),
      ],
    }),
  };
}
