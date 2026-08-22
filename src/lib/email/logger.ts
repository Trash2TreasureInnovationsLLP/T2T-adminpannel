import { createAdminClient } from "@/lib/supabase";
import { EmailLogEntry } from "./types";

/**
 * Logs email dispatches to the database table `email_logs`.
 * Filters out passwords, tokens, reset URLs, and OTP values to protect privacy & security.
 */
export async function logEmail(entry: EmailLogEntry): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Sanitize metadata if present
    const sanitizedMetadata: Record<string, unknown> = {};
    if (entry.metadata) {
      for (const [key, value] of Object.entries(entry.metadata)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes("password") ||
          lowerKey.includes("otp") ||
          lowerKey.includes("token") ||
          lowerKey.includes("secret") ||
          lowerKey.includes("key") ||
          lowerKey.includes("url")
        ) {
          sanitizedMetadata[key] = "[REDACTED_SENSITIVE]";
        } else {
          sanitizedMetadata[key] = value;
        }
      }
    }

    const recipientStr = Array.isArray(entry.recipient) ? entry.recipient.join(", ") : entry.recipient;

    const { error } = await supabase.from("email_logs").insert({
      recipient: recipientStr,
      sender: entry.sender,
      subject: entry.subject || "T2T Notification",
      template: entry.template || "generic",
      provider: entry.provider,
      provider_message_id: entry.provider_message_id || null,
      status: entry.status,
      error_message: entry.error_message || null,
      metadata: sanitizedMetadata,
      sent_at: entry.status === "sent" ? new Date().toISOString() : null,
    });

    if (error) {
      console.warn("[Email Logger Notice]: Failed to save log entry to database:", error.message);
    }
  } catch (err) {
    // Non-blocking: Logging failure should never break email sending
    console.error("[Email Logger Error]:", err);
  }
}
