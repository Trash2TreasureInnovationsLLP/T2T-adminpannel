import { EmailProvider, SendEmailOptions, SendEmailResult } from "../types";

export class SESEmailProvider implements EmailProvider {
  readonly type = "ses" as const;
  private region: string | null = null;
  private accessKeyId: string | null = null;
  private secretAccessKey: string | null = null;

  constructor() {
    this.region = process.env.AWS_SES_REGION || process.env.AWS_REGION || "us-east-1";
    this.accessKeyId = process.env.AWS_ACCESS_KEY_ID || null;
    this.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || null;
  }

  isConfigured(): boolean {
    return this.accessKeyId !== null && this.secretAccessKey !== null;
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.type,
        error: "AWS SES credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.",
      };
    }

    try {
      const from = options.from || process.env.EMAIL_FROM_EMAIL || "noreply@trash2treasure.co.in";
      const destination = Array.isArray(options.to) ? options.to : [options.to];

      const payload = {
        FromEmailAddress: from,
        Destination: {
          ToAddresses: destination,
        },
        Content: {
          Simple: {
            Subject: { Data: options.subject, Charset: "UTF-8" },
            Body: {
              Html: { Data: options.html, Charset: "UTF-8" },
              ...(options.text ? { Text: { Data: options.text, Charset: "UTF-8" } } : {}),
            },
          },
        },
        ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
      };

      const endpoint = `https://email.${this.region}.amazonaws.com/v2/email/outbound-emails`;
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-amz-access-token": this.accessKeyId || "",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          provider: this.type,
          error: errorData.message || `AWS SES HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      return {
        success: true,
        messageId: data.MessageId || `ses-${Date.now()}`,
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
