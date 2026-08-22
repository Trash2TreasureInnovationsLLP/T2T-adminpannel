import { createAdminClient } from "@/lib/supabase";

/**
 * Checks if an email with the given idempotency key has already been successfully sent.
 * Returns true if a record exists and was already processed.
 */
export async function isAlreadyDispatched(idempotencyKey?: string): Promise<boolean> {
  if (!idempotencyKey) return false;

  try {
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("email_logs")
      .select("id, status")
      .eq("idempotency_key", idempotencyKey)
      .in("status", ["sent", "delivered"])
      .maybeSingle();

    return !!existing;
  } catch (err) {
    console.warn("[Idempotency Check Notice]:", err);
    return false;
  }
}
