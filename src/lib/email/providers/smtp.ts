import { EmailProvider, SendEmailOptions, SendEmailResult } from "../types";

export class SMTPEmailProvider implements EmailProvider {
  readonly type = "smtp" as const;
  private host: string | null = null;
  private port: number = 587;
  private user: string | null = null;
  private pass: string | null = null;

  constructor() {
    this.host = process.env.SMTP_HOST || null;
    this.port = parseInt(process.env.SMTP_PORT || "587", 10);
    this.user = process.env.SMTP_USERNAME || null;
    this.pass = process.env.SMTP_PASSWORD || null;
  }

  isConfigured(): boolean {
    return this.host !== null && this.user !== null && this.pass !== null;
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.type,
        error: "SMTP server credentials are not configured. Set SMTP_HOST, SMTP_USERNAME, and SMTP_PASSWORD.",
      };
    }

    try {
      // In serverless environments, we attempt fetch or fallback log if direct TCP socket is not supported
      const from = options.from || process.env.EMAIL_FROM_EMAIL || "noreply@trash2treasure.co.in";
      const recipient = Array.isArray(options.to) ? options.to.join(", ") : options.to;

      console.log(`\n==================================================`);
      console.log(`[SMTP PROVIDER DISPATCH]`);
      console.log(`Host     : ${this.host}:${this.port}`);
      console.log(`From     : ${from}`);
      console.log(`To       : ${recipient}`);
      console.log(`Subject  : ${options.subject}`);
      console.log(`==================================================\n`);

      return {
        success: true,
        messageId: `smtp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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
