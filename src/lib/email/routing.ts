import { AdminRole } from "./types";
import { getAdminEmailsByRole } from "./recipients";

export type AdminNotificationEvent =
  | "WASTE_VERIFICATION_REQUIRED"
  | "PAYMENT_FAILURE"
  | "SECURITY_ALERT"
  | "PICKUP_FAILURE"
  | "LARGE_REWARD_REDEMPTION"
  | "SYSTEM_OUTAGE";

const ROUTING_RULES: Record<AdminNotificationEvent, AdminRole[]> = {
  WASTE_VERIFICATION_REQUIRED: ["regional_admin", "moderator"],
  PAYMENT_FAILURE: ["super_admin", "admin"],
  SECURITY_ALERT: ["super_admin"],
  PICKUP_FAILURE: ["regional_admin", "staff"],
  LARGE_REWARD_REDEMPTION: ["super_admin", "admin", "regional_admin"],
  SYSTEM_OUTAGE: ["super_admin", "admin"],
};

/**
 * Returns array of dynamic admin email addresses from database for a specific event based on role routing rules.
 */
export async function getRecipientsForAdminEvent(
  event: AdminNotificationEvent,
  stateId?: string
): Promise<string[]> {
  const targetRoles = ROUTING_RULES[event] || ["super_admin", "admin"];
  return getAdminEmailsByRole(targetRoles, stateId);
}
