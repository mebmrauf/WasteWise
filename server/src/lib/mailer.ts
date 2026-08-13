import nodemailer from "nodemailer";
import { env } from "./env";
import { logger } from "./logger";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!env.SMTP_HOST || !env.EMAIL_USER || !env.EMAIL_PASS) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
    });
  }
  return transporter;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const client = getTransporter();
  if (!client) {
    logger.warn({ to: opts.to }, "Email not sent — SMTP is not configured");
    return;
  }

  await client.sendMail({
    from: env.EMAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}

/**
 * Kept deliberately plain (no images, no tracking pixel, no link-heavy layout,
 * a real plain-text alternative) — this is the profile most mailbox providers'
 * spam filters expect from a one-time transactional code, versus a marketing-
 * styled HTML email. The domain behind EMAIL_FROM still needs SPF/DKIM/DMARC
 * verified in Resend for inbox placement; content alone can't fix that.
 */
export function buildVerificationCodeEmail(fullName: string, code: string): { subject: string; html: string; text: string } {
  const firstName = fullName.trim().split(" ")[0] || "there";
  const subject = `Your WasteWise verification code is ${code}`;

  const text = [
    `Hi ${firstName},`,
    ``,
    `Your WasteWise email verification code is: ${code}`,
    ``,
    `Enter this code in the app to verify your email address. This code expires in 30 minutes.`,
    ``,
    `If you didn't create a WasteWise account, you can safely ignore this email.`,
    ``,
    `— The WasteWise Team`,
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f7f8fa;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8fa;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;max-width:480px;width:100%;">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <p style="margin:0 0 16px 0;font-size:15px;line-height:22px;color:#1f2937;">Hi ${firstName},</p>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:22px;color:#1f2937;">
                  Use the code below to verify your email address for your WasteWise account.
                </p>
                <p style="margin:0 0 24px 0;text-align:center;">
                  <span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:8px;color:#14532d;background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:16px 24px;">${code}</span>
                </p>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:20px;color:#4b5563;">
                  This code expires in 30 minutes. If you didn't create a WasteWise account, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 32px 32px;border-top:1px solid #e5e7eb;">
                <p style="margin:16px 0 0 0;font-size:12px;line-height:18px;color:#9ca3af;">
                  WasteWise — this is a one-time transactional message sent because an account was created with this email address.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

/**
 * Same plain, spam-safe profile as buildVerificationCodeEmail — a password
 * reset code is the highest-stakes OTP this app sends, so it gets the same
 * minimal, link-free treatment.
 */
export function buildPasswordResetCodeEmail(fullName: string, code: string): { subject: string; html: string; text: string } {
  const firstName = fullName.trim().split(" ")[0] || "there";
  const subject = `Your WasteWise password reset code is ${code}`;

  const text = [
    `Hi ${firstName},`,
    ``,
    `We received a request to reset your WasteWise password. Your reset code is: ${code}`,
    ``,
    `Enter this code in the app to choose a new password. This code expires in 15 minutes.`,
    ``,
    `If you didn't request a password reset, you can safely ignore this email — your password won't be changed.`,
    ``,
    `— The WasteWise Team`,
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f7f8fa;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8fa;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;max-width:480px;width:100%;">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <p style="margin:0 0 16px 0;font-size:15px;line-height:22px;color:#1f2937;">Hi ${firstName},</p>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:22px;color:#1f2937;">
                  We received a request to reset your WasteWise password. Use the code below to choose a new one.
                </p>
                <p style="margin:0 0 24px 0;text-align:center;">
                  <span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:8px;color:#14532d;background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:16px 24px;">${code}</span>
                </p>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:20px;color:#4b5563;">
                  This code expires in 15 minutes. If you didn't request a password reset, you can safely ignore this email — your password won't be changed.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 32px 32px;border-top:1px solid #e5e7eb;">
                <p style="margin:16px 0 0 0;font-size:12px;line-height:18px;color:#9ca3af;">
                  WasteWise — this is a one-time transactional message sent because a password reset was requested for this email address.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

/**
 * Generic notification email — mirrors the same plain, spam-safe profile as
 * buildVerificationCodeEmail (no images, real plain-text alternative, one
 * link). Used for pickup-update and rewards/referral notification emails,
 * which are opt-in per user preference rather than one-time codes.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildNotificationEmail(title: string, message: string): { subject: string; html: string; text: string } {
  const siteUrl = env.CLIENT_ORIGIN[0] ?? "https://wastewise.com";
  const subject = title;
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);

  const text = [
    title,
    ``,
    message,
    ``,
    `Open WasteWise: ${siteUrl}`,
    ``,
    `You're receiving this because it's enabled in your WasteWise notification preferences — you can turn it off anytime from your profile page.`,
    ``,
    `— The WasteWise Team`,
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f7f8fa;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8fa;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;max-width:480px;width:100%;">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <p style="margin:0 0 12px 0;font-size:17px;font-weight:700;line-height:24px;color:#111827;">${safeTitle}</p>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:22px;color:#1f2937;">${safeMessage}</p>
                <p style="margin:0 0 8px 0;">
                  <a href="${siteUrl}" style="display:inline-block;font-size:14px;font-weight:600;color:#ffffff;background-color:#15803d;border-radius:6px;padding:10px 20px;text-decoration:none;">Open WasteWise</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 32px 32px;border-top:1px solid #e5e7eb;">
                <p style="margin:16px 0 0 0;font-size:12px;line-height:18px;color:#9ca3af;">
                  You're receiving this because it's enabled in your WasteWise notification preferences — you can turn it off anytime from your profile page.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
