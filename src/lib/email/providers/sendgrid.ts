import { EmailProvider, SendEmailOptions, SendEmailResult } from "../types";

export class SendGridEmailProvider implements EmailProvider {
  readonly type = "sendgrid" as const;
  private apiKey: string | null = null;

  constructor() {
    const key = process.env.SENDGRID_API_KEY;
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
        error: "SendGrid API key is not configured. Set SENDGRID_API_KEY in environment variables.",
      };
    }

    try {
      const recipients = (Array.isArray(options.to) ? options.to : [options.to]).map((email) => ({
        email,
      }));

      const fromEmail = options.from || process.env.EMAIL_FROM_EMAIL || "noreply@trash2treasure.co.in";

      const payload = {
        personalizations: [{ to: recipients }],
        from: { email: fromEmail, name: process.env.EMAIL_FROM_NAME || "Trash2Treasure" },
        subject: options.subject,
        content: [
          ...(options.text ? [{ type: "text/plain", value: options.text }] : []),
          { type: "text/html", value: options.html },
        ],
        reply_to: options.replyTo ? { email: options.replyTo } : undefined,
      };

      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok && res.status !== 202) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.errors?.[0]?.message || `SendGrid HTTP ${res.status}`;
        return {
          success: false,
          provider: this.type,
          error: errorMessage,
        };
      }

      const messageId = res.headers.get("x-message-id") || `sg-${Date.now()}`;

      return {
        success: true,
        messageId,
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
