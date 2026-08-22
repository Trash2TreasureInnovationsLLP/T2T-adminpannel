import { dispatchEmail } from "./provider";
import { SendEmailOptions, SendEmailResult, EmailServiceRequest, T2TEventName, EmailCategory } from "./types";
import { isAlreadyDispatched } from "./idempotency";
import { getRecipientsForAdminEvent } from "./routing";

// Template Generators
import {
  renderPasswordResetEmail,
  renderOtpEmail,
  renderConfirmationEmail,
  renderMagicLinkEmail,
  renderAdminInviteEmail,
  renderPasswordChangedEmail,
} from "./templates/auth";
import { renderUserWelcome, renderProfileUpdated, renderUserSecurityAlert } from "./templates/users";
import { renderWasteSubmitted, renderWasteApproved, renderWasteRejected } from "./templates/waste";
import { renderEcoPointsCredited } from "./templates/ecopoints";
import { renderRewardRedeemed, renderCouponExpiring } from "./templates/rewards";
import { renderPickupUpdate } from "./templates/pickups";
import { renderBinReportEmail } from "./templates/bins";
import { renderPaymentReceipt } from "./templates/payments";
import { renderSystemAlert } from "./templates/system";
import { renderMarketingCampaign } from "./templates/marketing";
import { renderAdminAlertEmail } from "./templates/admin";

export class CentralEmailService {
  /**
   * Main entry point for sending any email in the T2T Ecosystem.
   */
  async send(req: EmailServiceRequest): Promise<SendEmailResult> {
    // 1. Duplicate Prevention Check
    if (req.idempotencyKey && (await isAlreadyDispatched(req.idempotencyKey))) {
      console.log(`[EmailService Idempotency] Skipping duplicate email for key: ${req.idempotencyKey}`);
      return {
        success: true,
        provider: "resend",
        idempotent: true,
      };
    }

    // 2. Render Template
    const { subject, html, category } = this.renderTemplate(req.template, req.data);

    // 3. Assemble Options
    const options: SendEmailOptions = {
      to: req.to,
      subject,
      html,
      category: req.category || category,
      template: req.template,
      idempotencyKey: req.idempotencyKey,
      eventId: req.eventId,
      replyTo: req.replyTo,
      metadata: req.data,
    };

    // 4. Execute Dispatch
    return dispatchEmail(options);
  }

  /**
   * Emits a system event that automatically maps to template(s) and recipient(s).
   */
  async emitEvent(event: T2TEventName, payload: Record<string, any>): Promise<SendEmailResult[]> {
    const results: SendEmailResult[] = [];

    switch (event) {
      case "USER_REGISTERED": {
        const res = await this.send({
          template: "users.welcome",
          to: payload.email,
          data: { userName: payload.userName },
          idempotencyKey: `user_registered_${payload.userId}`,
          eventId: event,
        });
        results.push(res);
        break;
      }

      case "WASTE_APPROVED": {
        const userRes = await this.send({
          template: "waste.approved",
          to: payload.email,
          data: payload,
          idempotencyKey: `waste_approved_${payload.submissionId}`,
          eventId: event,
        });
        results.push(userRes);
        break;
      }

      case "WASTE_SUBMITTED": {
        // User acknowledgement
        const userRes = await this.send({
          template: "waste.submitted",
          to: payload.email,
          data: payload,
          idempotencyKey: `waste_submitted_user_${payload.submissionId}`,
          eventId: event,
        });
        results.push(userRes);

        // Role-based Admin Notification
        const adminRecipients = await getRecipientsForAdminEvent("WASTE_VERIFICATION_REQUIRED", payload.stateId);
        if (adminRecipients.length > 0) {
          const adminRes = await this.send({
            template: "admin.alert",
            to: adminRecipients,
            data: {
              adminName: "Regional Admin",
              alertTitle: "Waste Verification Required",
              alertCategory: "OPERATIONS",
              message: `New waste submission ${payload.submissionId} requires regional verification.`,
              details: [
                { label: "Submission ID", value: payload.submissionId },
                { label: "Category", value: payload.category || "General" },
                { label: "Weight", value: `${payload.weightKg || 0} kg` },
              ],
              actionUrl: "https://admin.trash2treasure.co.in/waste-submissions",
            },
            idempotencyKey: `waste_submitted_admin_${payload.submissionId}`,
            eventId: event,
          });
          results.push(adminRes);
        }
        break;
      }

      case "REWARD_REDEEMED": {
        const res = await this.send({
          template: "rewards.redeemed",
          to: payload.email,
          data: payload,
          idempotencyKey: `reward_redeemed_${payload.redemptionId}`,
          eventId: event,
        });
        results.push(res);
        break;
      }

      case "SECURITY_ALERT": {
        const adminRecipients = await getRecipientsForAdminEvent("SECURITY_ALERT");
        const res = await this.send({
          template: "admin.alert",
          to: adminRecipients,
          data: {
            adminName: "Super Admin",
            alertTitle: "Security Incident Alert",
            alertCategory: "SECURITY",
            message: payload.message || "Suspicious authorization attempt detected.",
            details: payload.details,
          },
          eventId: event,
        });
        results.push(res);
        break;
      }
    }

    return results;
  }

  /**
   * Internal Template Rendering Matrix
   */
  private renderTemplate(
    template: string,
    data: Record<string, any>
  ): { subject: string; html: string; category: EmailCategory } {
    switch (template) {
      // Auth Templates
      case "auth.reset_password":
        return {
          subject: "Reset your Trash2Treasure Admin password",
          html: renderPasswordResetEmail(data.recipientName || "Administrator", data.resetUrl || "#"),
          category: "auth",
        };
      case "auth.otp":
        return {
          subject: `Your Trash2Treasure verification code: ${data.otpCode}`,
          html: renderOtpEmail(data.recipientName || "Valued User", data.otpCode || "000000"),
          category: "auth",
        };
      case "auth.confirm":
        return {
          subject: "Confirm your Trash2Treasure account",
          html: renderConfirmationEmail(data.recipientName || "Valued User", data.confirmationUrl || "#"),
          category: "auth",
        };
      case "auth.magic_link":
        return {
          subject: "Your Trash2Treasure sign-in link",
          html: renderMagicLinkEmail(data.recipientName || "Valued User", data.magicLinkUrl || "#"),
          category: "auth",
        };
      case "auth.invite":
        return {
          subject: "Invitation to Trash2Treasure Admin Portal",
          html: renderAdminInviteEmail({
            recipientName: data.recipientName || "Administrator",
            role: data.role || "Regional Admin",
            inviteUrl: data.inviteUrl || "#",
          }),
          category: "auth",
        };

      // Users Templates
      case "users.welcome": {
        const res = renderUserWelcome(data.userName || "Valued Customer");
        return { ...res, category: "users" };
      }
      case "users.profile_updated": {
        const res = renderProfileUpdated(data.userName || "Valued Customer", data.changes || ["Profile details"]);
        return { ...res, category: "users" };
      }
      case "users.security_alert": {
        const res = renderUserSecurityAlert(data.userName || "Valued Customer", data.alertDetail || "Security notification", data.ipAddress);
        return { ...res, category: "users" };
      }

      // Waste Templates
      case "waste.submitted": {
        const res = renderWasteSubmitted(data.userName || "Customer", data.submissionId || "SUB-000", data.category || "General", data.weightKg || 0);
        return { ...res, category: "waste" };
      }
      case "waste.approved": {
        const res = renderWasteApproved(data.userName || "Customer", data.submissionId || "SUB-000", data.category || "General", data.weightKg || 0, data.ecoPoints || 0);
        return { ...res, category: "waste" };
      }
      case "waste.rejected": {
        const res = renderWasteRejected(data.userName || "Customer", data.submissionId || "SUB-000", data.reason || "Non-conforming items");
        return { ...res, category: "waste" };
      }

      // EcoPoints Templates
      case "ecopoints.credited": {
        const res = renderEcoPointsCredited(data.userName || "Customer", data.pointsAmount || 0, data.reason || "Waste Recycling Reward");
        return { ...res, category: "ecopoints" };
      }

      // Rewards Templates
      case "rewards.redeemed": {
        const res = renderRewardRedeemed(data.userName || "Customer", data.rewardTitle || "Reward Coupon", data.couponCode || "VOUCHER-000", data.expiryDate);
        return { ...res, category: "rewards" };
      }
      case "rewards.expiring": {
        const res = renderCouponExpiring(data.userName || "Customer", data.rewardTitle || "Coupon", data.couponCode || "VOUCHER-000", data.daysLeft || 3);
        return { ...res, category: "rewards" };
      }

      // Pickups Templates
      case "pickups.update": {
        const res = renderPickupUpdate(data.userName || "Customer", data.requestId || "REQ-000", data.status || "requested", data);
        return { ...res, category: "pickups" };
      }

      // Bins Templates
      case "bins.report": {
        const res = renderBinReportEmail(data.userName || "Citizen", data.binId || "BIN-000", data.issueType || "Full", data.location || "City Center");
        return { ...res, category: "bins" };
      }

      // Payments Templates
      case "payments.receipt": {
        const res = renderPaymentReceipt(data.userName || "Customer", data.transactionId || "TXN-000", data.amount || "₹0.00", data.purpose || "Pickup Service Fee", data.date || new Date().toLocaleDateString());
        return { ...res, category: "payments" };
      }

      // System Templates
      case "system.alert": {
        const res = renderSystemAlert(data.title || "System Notification", data.message || "Routine maintenance notification", data.severity || "INFO");
        return { ...res, category: "system" };
      }

      // Marketing Templates
      case "marketing.campaign": {
        const res = renderMarketingCampaign(data.userName || "Valued Partner", data.campaignTitle || "Trash2Treasure Announcement", data.messageBodyHtml || "", data.cta, data.unsubscribeUrl);
        return { ...res, category: "marketing" };
      }

      // Admin Templates
      case "admin.alert": {
        const html = renderAdminAlertEmail({
          adminName: data.adminName || "Administrator",
          alertTitle: data.alertTitle || "Admin Alert",
          alertCategory: data.alertCategory || "OPERATIONS",
          message: data.message || "Action required",
          details: data.details,
          actionUrl: data.actionUrl,
        });
        return {
          subject: `[T2T ADMIN] ${data.alertTitle || "Alert"}`,
          html,
          category: "admin",
        };
      }

      default: {
        return {
          subject: data.subject || "Trash2Treasure Notification",
          html: `<p style="color: #FFF;">${data.message || "Notification from Trash2Treasure"}</p>`,
          category: "users",
        };
      }
    }
  }
}

export const emailService = new CentralEmailService();
