import { Resend } from "resend";
import { EmailProvider, SendEmailOptions, SendEmailResult } from "../types";

export class ResendEmailProvider implements EmailProvider {
  readonly type = "resend" as const;
  private client: Resend | null = null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      this.client = new Resend(apiKey);
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.client) {
      return {
        success: false,
        provider: this.type,
        error: "Resend API key is not configured. Set RESEND_API_KEY in environment variables.",
      };
    }

    try {
      const recipient = Array.isArray(options.to) ? options.to : [options.to];
      const from = options.from || process.env.EMAIL_FROM_EMAIL || "Trash2Treasure <noreply@trash2treasure.co.in>";

      const response = await this.client.emails.send({
        from,
        to: recipient,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo || process.env.EMAIL_REPLY_TO,
      });

      if (response.error) {
        return {
          success: false,
          provider: this.type,
          error: response.error.message,
        };
      }

      return {
        success: true,
        messageId: response.data?.id,
        provider: this.type,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        provider: this.type,
        error: errorMessage,
      };
    }
  }
}
