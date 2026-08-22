export type EmailProviderType =
  | "resend"
  | "brevo"
  | "sendgrid"
  | "ses"
  | "postmark"
  | "smtp";

export type EmailCategory =
  | "auth"
  | "users"
  | "waste"
  | "ecopoints"
  | "rewards"
  | "pickups"
  | "bins"
  | "payments"
  | "admin"
  | "system"
  | "marketing";

export type EmailStatus =
  | "pending"
  | "processing"
  | "sent"
  | "delivered"
  | "failed"
  | "retrying"
  | "cancelled";

export type AdminRole =
  | "super_admin"
  | "regional_admin"
  | "admin"
  | "moderator"
  | "staff";

export type T2TEventName =
  | "USER_REGISTERED"
  | "EMAIL_VERIFICATION_REQUESTED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_CHANGED"
  | "EMAIL_CHANGED"
  | "ADMIN_INVITED"
  | "WASTE_SUBMITTED"
  | "WASTE_VERIFICATION_STARTED"
  | "WASTE_APPROVED"
  | "WASTE_REJECTED"
  | "WASTE_RESUBMISSION_REQUIRED"
  | "ECOPOINTS_EARNED"
  | "ECOPOINTS_CREDITED"
  | "ECOPOINTS_DEDUCTED"
  | "REWARD_REDEEMED"
  | "COUPON_GENERATED"
  | "COUPON_EXPIRING"
  | "COUPON_EXPIRED"
  | "PICKUP_REQUESTED"
  | "PICKUP_CONFIRMED"
  | "PICKUP_ASSIGNED"
  | "PICKUP_REMINDER"
  | "PICKUP_COMPLETED"
  | "PICKUP_FAILED"
  | "BIN_ISSUE_REPORTED"
  | "BIN_ISSUE_RESOLVED"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "PAYMENT_REFUNDED"
  | "SECURITY_ALERT"
  | "SYSTEM_OUTAGE"
  | "MARKETING_CAMPAIGN";

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  category?: EmailCategory;
  template?: string;
  idempotencyKey?: string;
  eventId?: string;
  metadata?: Record<string, unknown>;
  unsubscribeUrl?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  provider: EmailProviderType;
  error?: string;
  retried?: boolean;
  idempotent?: boolean;
}

export interface EmailProvider {
  readonly type: EmailProviderType;
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
  isConfigured(): boolean;
}

export interface EmailLogEntry {
  id?: string;
  recipient: string;
  sender: string;
  subject: string;
  template: string;
  category: EmailCategory;
  provider: EmailProviderType;
  provider_message_id?: string;
  idempotency_key?: string;
  event_id?: string;
  status: EmailStatus;
  error_message?: string;
  retry_count?: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
  sent_at?: string;
  delivered_at?: string;
}

export interface EmailServiceRequest {
  template: string;
  to: string | string[];
  data: Record<string, any>;
  idempotencyKey?: string;
  eventId?: string;
  category?: EmailCategory;
  replyTo?: string;
}
