import { EmailProvider, SendEmailOptions, SendEmailResult } from "../types";

export class PostmarkEmailProvider implements EmailProvider {
  readonly type = "postmark" as const;
  private serverToken: string | null = null;

  constructor() {
    const token = process.env.POSTMARK_SERVER_TOKEN;
    if (token && token.trim().length > 0) {
      this.serverToken = token;
    }
  }

  isConfigured(): boolean {
    return this.serverToken !== null;
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.serverToken) {
      return {
        success: false,
        provider: this.type,
        error: "Postmark server token is not configured. Set POSTMARK_SERVER_TOKEN in environment variables.",
      };
    }

    try {
      const recipient = Array.isArray(options.to) ? options.to.join(",") : options.to;
      const from = options.from || process.env.EMAIL_FROM_EMAIL || "noreply@trash2treasure.co.in";

      const payload = {
        From: from,
        To: recipient,
        Subject: options.subject,
        HtmlBody: options.html,
        TextBody: options.text,
        ReplyTo: options.replyTo,
        MessageStream: "outbound",
      };

      const res = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "X-Postmark-Server-Token": this.serverToken,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.ErrorCode) {
        return {
          success: false,
          provider: this.type,
          error: data.Message || `Postmark error code ${data.ErrorCode}`,
        };
      }

      return {
        success: true,
        messageId: data.MessageID,
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
