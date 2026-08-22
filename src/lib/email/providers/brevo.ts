import { EmailProvider, SendEmailOptions, SendEmailResult } from "../types";

export class BrevoEmailProvider implements EmailProvider {
  readonly type = "brevo" as const;
  private apiKey: string | null = null;

  constructor() {
    const key = process.env.BREVO_API_KEY;
    if (key && key.trim().length > 0) {
      this.apiKey = key;
    }
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.apiKey) {
      return {
        success: false,
        provider: this.type,
        error: "Brevo API key is not configured. Set BREVO_API_KEY in environment variables.",
      };
    }

    try {
      const recipients = (Array.isArray(options.to) ? options.to : [options.to]).map((email) => ({
        email,
      }));

      const fromAddress = options.from || process.env.EMAIL_FROM_EMAIL || "noreply@trash2treasure.co.in";
      const fromName = process.env.EMAIL_FROM_NAME || "Trash2Treasure";

      const payload = {
        sender: { email: fromAddress, name: fromName },
        to: recipients,
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.text,
        replyTo: options.replyTo ? { email: options.replyTo } : undefined,
      };

      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          provider: this.type,
          error: data.message || `Brevo API HTTP ${res.status}`,
        };
      }

      return {
        success: true,
        messageId: data.messageId,
        provider: this.type,
      };
    } catch (err) {
      return {
        success: false,
        provider: this.type,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
