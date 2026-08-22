import { createAdminClient } from "@/lib/supabase";
import { AdminRole, T2TEventName } from "./types";

/**
 * Dynamically resolves the email address for a user ID from public.profiles / auth.users.
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  if (!userId) return null;
  const supabase = createAdminClient();

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.email) return profile.email;

    // Fallback: check auth.users via admin API
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    return authUser?.user?.email || null;
  } catch (err) {
    console.error(`[getUserEmail Error for ${userId}]:`, err);
    return null;
  }
}

/**
 * Dynamically resolves the email address for an administrator ID.
 */
export async function getAdminEmail(adminId: string): Promise<string | null> {
  if (!adminId) return null;
  const supabase = createAdminClient();

  try {
    const { data: admin } = await supabase
      .from("admins")
      .select("email")
      .eq("id", adminId)
      .maybeSingle();

    if (admin?.email) return admin.email;
    return getUserEmail(adminId);
  } catch (err) {
    console.error(`[getAdminEmail Error for ${adminId}]:`, err);
    return null;
  }
}

/**
 * Dynamically resolves email addresses of active Super Administrators.
 */
export async function getSuperAdminEmails(): Promise<string[]> {
  const supabase = createAdminClient();

  try {
    const { data: admins } = await supabase
      .from("admins")
      .select("email")
      .eq("status", "active")
      .eq("admin_type", "super_admin");

    if (admins && admins.length > 0) {
      return Array.from(new Set(admins.map((a) => a.email).filter(Boolean)));
    }
  } catch (err) {
    console.error("[getSuperAdminEmails Error]:", err);
  }

  const fallback = process.env.ADMIN_NOTIFICATIONS_EMAIL || process.env.SUPPORT_EMAIL;
  return fallback ? [fallback] : [];
}

/**
 * Dynamically resolves email addresses of active Regional Administrators for a given state/region.
 */
export async function getRegionalAdminEmails(stateId?: string): Promise<string[]> {
  const supabase = createAdminClient();

  try {
    let query = supabase
      .from("admins")
      .select("email")
      .eq("status", "active")
      .in("admin_type", ["regional_admin", "super_admin"]);

    if (stateId) {
      query = query.or(`assigned_state_id.eq.${stateId},admin_type.eq.super_admin`);
    }

    const { data: admins } = await query;

    if (admins && admins.length > 0) {
      return Array.from(new Set(admins.map((a) => a.email).filter(Boolean)));
    }
  } catch (err) {
    console.error("[getRegionalAdminEmails Error]:", err);
  }

  const fallback = process.env.ADMIN_NOTIFICATIONS_EMAIL || process.env.SUPPORT_EMAIL;
  return fallback ? [fallback] : [];
}

/**
 * Dynamically resolves administrators matching specific application roles.
 */
export async function getAdminEmailsByRole(roles: AdminRole[], stateId?: string): Promise<string[]> {
  const supabase = createAdminClient();

  try {
    let query = supabase
      .from("admins")
      .select("email")
      .eq("status", "active")
      .in("admin_type", roles);

    if (stateId) {
      query = query.or(`assigned_state_id.eq.${stateId},admin_type.eq.super_admin`);
    }

    const { data: admins } = await query;

    if (admins && admins.length > 0) {
      return Array.from(new Set(admins.map((a) => a.email).filter(Boolean)));
    }
  } catch (err) {
    console.error("[getAdminEmailsByRole Error]:", err);
  }

  const fallback = process.env.ADMIN_NOTIFICATIONS_EMAIL || process.env.SUPPORT_EMAIL;
  return fallback ? [fallback] : [];
}

/**
 * Master dynamic recipient resolver function for application events.
 */
export async function getNotificationRecipients(
  event: T2TEventName,
  context: { stateId?: string; userId?: string } = {}
): Promise<string[]> {
  switch (event) {
    case "SECURITY_ALERT":
    case "SYSTEM_OUTAGE":
      return getSuperAdminEmails();

    case "WASTE_SUBMITTED":
    case "WASTE_VERIFICATION_STARTED":
    case "BIN_ISSUE_REPORTED":
      return getAdminEmailsByRole(["regional_admin", "moderator"], context.stateId);

    case "PICKUP_REQUESTED":
    case "PICKUP_FAILED":
      return getAdminEmailsByRole(["regional_admin", "staff"], context.stateId);

    case "PAYMENT_FAILED":
      return getAdminEmailsByRole(["super_admin", "admin"]);

    default:
      if (context.userId) {
        const userEmail = await getUserEmail(context.userId);
        if (userEmail) return [userEmail];
      }
      return getSuperAdminEmails();
  }
}
