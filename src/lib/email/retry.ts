import { SendEmailOptions, SendEmailResult } from "./types";

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}

/**
 * Determines if an error is temporary and eligible for retry.
 */
export function isTransientError(error: unknown, statusCode?: number): boolean {
  if (statusCode) {
    // 429 Too Many Requests, 500, 502, 503, 504 are transient
    if (statusCode === 429 || (statusCode >= 500 && statusCode < 600)) {
      return true;
    }
    // 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found are permanent
    if (statusCode >= 400 && statusCode < 500) {
      return false;
    }
  }

  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  // Permanent error keywords
  if (
    errorMessage.includes("invalid recipient") ||
    errorMessage.includes("invalid email") ||
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("forbidden") ||
    errorMessage.includes("invalid_api_key") ||
    errorMessage.includes("authentication failed") ||
    errorMessage.includes("not verified")
  ) {
    return false;
  }

  // Transient error keywords (network, timeout, rate limit, 5xx)
  if (
    errorMessage.includes("rate limit") ||
    errorMessage.includes("429") ||
    errorMessage.includes("econnreset") ||
    errorMessage.includes("etimedout") ||
    errorMessage.includes("fetch failed") ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("500") ||
    errorMessage.includes("502") ||
    errorMessage.includes("503") ||
    errorMessage.includes("504")
  ) {
    return true;
  }

  return false;
}

/**
 * Wraps an email sending execution in a safe retry loop with exponential backoff.
 */
export async function withExponentialBackoff(
  fn: () => Promise<SendEmailResult>,
  options: RetryOptions = {}
): Promise<SendEmailResult> {
  const maxRetries = options.maxRetries ?? 2;
  const initialDelayMs = options.initialDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 4000;

  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt <= maxRetries) {
    try {
      const result = await fn();
      if (result.success) {
        if (attempt > 0) {
          result.retried = true;
        }
        return result;
      }

      // Check if error is retryable
      if (!isTransientError(result.error)) {
        return result; // Don't retry permanent failures
      }

      if (attempt === maxRetries) {
        return {
          ...result,
          error: `[Failed after ${maxRetries + 1} attempts]: ${result.error}`,
        };
      }
    } catch (err) {
      if (!isTransientError(err)) {
        return {
          success: false,
          provider: "resend",
          error: err instanceof Error ? err.message : String(err),
        };
      }

      if (attempt === maxRetries) {
        return {
          success: false,
          provider: "resend",
          error: `[Network exception after ${maxRetries + 1} attempts]: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }

    attempt++;
    const jitter = Math.random() * 200;
    const actualDelay = Math.min(delay + jitter, maxDelayMs);
    console.warn(`[Email Retry] Attempt ${attempt}/${maxRetries} after transient error. Retrying in ${Math.round(actualDelay)}ms...`);
    await new Promise((resolve) => setTimeout(resolve, actualDelay));
    delay *= 2;
  }

  return {
    success: false,
    provider: "resend",
    error: "Retry loop terminated unexpectedly",
  };
}
