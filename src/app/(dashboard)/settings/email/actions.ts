"use server";

import { createAdminClient, createServerClient } from "@/lib/supabase";
import { sendEmail, emailService } from "@/lib/email";
import { providerFactory } from "@/lib/email/provider";
import { EmailCategory } from "@/lib/email/types";

export async function getEmailSettings() {
  const provider = providerFactory.getProvider();
  const providerType = process.env.EMAIL_PROVIDER || "resend";
  const defaultFrom = process.env.EMAIL_FROM_EMAIL || "noreply@trash2treasure.co.in";

  return {
    provider: providerType,
    isConfigured: provider.isConfigured(),
    resendConfigured: !!process.env.RESEND_API_KEY,
    emailFrom: defaultFrom,
    adminSender: process.env.ADMIN_NOTIFICATIONS_EMAIL || "Trash2Treasure Admin <admin@trash2treasure.co.in>",
    supportSender: process.env.SUPPORT_EMAIL || "Trash2Treasure Support <support@trash2treasure.co.in>",
    domain: "trash2treasure.co.in",
  };
}

export async function getEmailLogsAction(category?: EmailCategory | "all") {
  const supabase = createAdminClient();

  try {
    let query = supabase
      .from("email_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.warn("[getEmailLogsAction Error]:", error.message);
      return { success: false, logs: [], error: error.message };
    }

    // Compute stats
    const total = logs?.length || 0;
    const sent = logs?.filter((l) => l.status === "sent" || l.status === "delivered").length || 0;
    const failed = logs?.filter((l) => l.status === "failed").length || 0;
    const lastSuccessful = logs?.find((l) => l.status === "sent" || l.status === "delivered")?.created_at || null;
    const lastFailed = logs?.find((l) => l.status === "failed")?.created_at || null;

    return {
      success: true,
      logs: logs || [],
      stats: {
        total,
        sent,
        failed,
        lastSuccessful,
        lastFailed,
      },
    };
  } catch (err) {
    return {
      success: false,
      logs: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function retryFailedEmailAction(logId: string) {
  const supabase = createAdminClient();

  try {
    const { data: log, error } = await supabase
      .from("email_logs")
      .select("*")
      .eq("id", logId)
      .maybeSingle();

    if (error || !log) {
      return { success: false, error: "Email log entry not found" };
    }

    // Re-dispatch using central emailService
    const result = await emailService.send({
      template: log.template || "generic",
      to: log.recipient,
      data: log.metadata || {},
      category: log.category as EmailCategory,
    });

    if (result.success) {
      await supabase.from("email_logs").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", logId);
    }

    return result;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function sendAdminTestEmailAction() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    let targetEmail: string | undefined = user?.email || undefined;

    // Fallback 1: check TEST_EMAIL environment variable
    if (!targetEmail && process.env.TEST_EMAIL && process.env.TEST_EMAIL.trim().length > 0) {
      targetEmail = process.env.TEST_EMAIL.trim();
    }

    // Fallback 2: query the first active administrator dynamically from database
    if (!targetEmail) {
      const adminClient = createAdminClient();
      const { data: admin } = await adminClient
        .from("admins")
        .select("email")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      targetEmail = admin?.email || undefined;
    }

    if (!targetEmail) {
      return {
        success: false,
        error: "No active administrator email address found in session or database. Please log in or configure TEST_EMAIL in environment variables.",
      };
    }

    const result = await emailService.send({
      template: "system.alert",
      to: targetEmail,
      data: {
        title: "T2T Central Email Infrastructure Test",
        message: "Operational system test email dispatched from the Admin Email Center.",
        severity: "INFO",
      },
      category: "system",
    });

    if (!result.success) {
      return { success: false, error: result.error || "Failed to deliver test email" };
    }

    return {
      success: true,
      recipient: targetEmail,
      messageId: result.messageId,
      message: `Test email dispatched to ${targetEmail}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
