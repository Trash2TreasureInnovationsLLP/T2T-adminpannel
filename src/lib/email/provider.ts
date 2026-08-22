import { EmailProvider, EmailProviderType, SendEmailOptions, SendEmailResult } from "./types";
import { ResendEmailProvider } from "./providers/resend";
import { BrevoEmailProvider } from "./providers/brevo";
import { SendGridEmailProvider } from "./providers/sendgrid";
import { SESEmailProvider } from "./providers/ses";
import { PostmarkEmailProvider } from "./providers/postmark";
import { SMTPEmailProvider } from "./providers/smtp";
import { withExponentialBackoff } from "./retry";
import { logEmail } from "./logger";

class ProviderFactory {
  private providers: Map<EmailProviderType, EmailProvider> = new Map();

  constructor() {
    this.providers.set("resend", new ResendEmailProvider());
    this.providers.set("brevo", new BrevoEmailProvider());
    this.providers.set("sendgrid", new SendGridEmailProvider());
    this.providers.set("ses", new SESEmailProvider());
    this.providers.set("postmark", new PostmarkEmailProvider());
    this.providers.set("smtp", new SMTPEmailProvider());
  }

  getProvider(type?: EmailProviderType): EmailProvider {
    const selectedType = type || (process.env.EMAIL_PROVIDER?.toLowerCase() as EmailProviderType) || "resend";
    const provider = this.providers.get(selectedType);
    if (!provider) {
      console.warn(`[ProviderFactory Warning]: Provider '${selectedType}' not recognized. Falling back to Resend.`);
      return this.providers.get("resend")!;
    }
    return provider;
  }

  getFallbackProvider(): EmailProvider | null {
    const fallbackType = process.env.EMAIL_FALLBACK_PROVIDER?.toLowerCase() as EmailProviderType | undefined;
    if (fallbackType && this.providers.has(fallbackType)) {
      const provider = this.providers.get(fallbackType)!;
      return provider.isConfigured() ? provider : null;
    }
    return null;
  }
}

export const providerFactory = new ProviderFactory();

/**
 * Dispatches an email using the primary configured provider with retry and optional fallback.
 */
export async function dispatchEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const primaryProvider = providerFactory.getProvider();

  // Execute primary provider with exponential backoff
  let result = await withExponentialBackoff(() => primaryProvider.sendEmail(options));

  // If primary provider failed and a fallback provider is configured, try fallback
  if (!result.success) {
    const fallbackProvider = providerFactory.getFallbackProvider();
    if (fallbackProvider && fallbackProvider.type !== primaryProvider.type) {
      console.warn(`[Email Dispatch] Primary provider '${primaryProvider.type}' failed. Attempting fallback provider '${fallbackProvider.type}'...`);
      const fallbackResult = await withExponentialBackoff(() => fallbackProvider.sendEmail(options));
      if (fallbackResult.success) {
        result = fallbackResult;
      }
    }
  }

  // Log dispatch to database asynchronously
  const recipientStr = Array.isArray(options.to) ? options.to.join(", ") : options.to;
  const senderStr = options.from || process.env.EMAIL_FROM_EMAIL || "noreply@trash2treasure.co.in";

  await logEmail({
    recipient: recipientStr,
    sender: senderStr,
    subject: options.subject,
    template: options.template || "generic",
    category: options.category || "users",
    provider: result.provider || primaryProvider.type,
    provider_message_id: result.messageId,
    status: result.success ? "sent" : "failed",
    error_message: result.error,
    metadata: options.metadata,
  });

  return result;
}
