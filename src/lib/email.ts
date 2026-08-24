import nodemailer from "nodemailer";
import { getResend, FROM_EMAIL } from "./resend";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: Buffer | string }>;
}

export async function sendTicketEmail(options: SendEmailOptions) {
  const { to, subject, html, attachments } = options;

  // 1. Try Nodemailer SMTP if configured (Gmail App Password, Brevo, SendGrid, or custom SMTP)
  const rawSmtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || "";
  const rawSmtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "";

  const smtpUser = rawSmtpUser.trim();
  const smtpPass = rawSmtpPass.replace(/\s+/g, ""); // strip spaces from Google 16-char app passcodes

  let smtpErrorDetails: string | null = null;

  if (smtpUser && smtpPass) {
    try {
      const port = Number(process.env.SMTP_PORT) || 587;
      const host = process.env.SMTP_HOST || "smtp-relay.brevo.com";
      const secure = port === 465;

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        requireTLS: port === 587,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const formattedAttachments = attachments?.map((a) => ({
        filename: a.filename,
        content: typeof a.content === "string" ? Buffer.from(a.content, "base64") : a.content,
      }));

      // Ensure 'from' is a valid email address format
      const senderEmail = (smtpUser.includes("@") && !smtpUser.includes("@smtp-brevo.com"))
        ? smtpUser
        : (process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev");

      const info = await transporter.sendMail({
        from: `TicketHub <${senderEmail}>`,
        to,
        subject,
        html,
        attachments: formattedAttachments,
      });

      console.log("[EMAIL_SENT_SMTP_SUCCESS]", info.messageId);
      return { success: true, provider: "smtp", messageId: info.messageId };
    } catch (err: any) {
      smtpErrorDetails = err?.message || String(err);
      console.error("[EMAIL_SMTP_ERROR]", smtpErrorDetails);
    }
  }

  // 2. Try Resend API (if configured)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && resendKey !== "re_XXXXXXXXXXXXXXXXXXXXXXXXXXXX") {
    try {
      const resend = getResend();

      const formattedResendAttachments = attachments?.map((a) => ({
        filename: a.filename,
        content: typeof a.content === "string" ? a.content : a.content.toString("base64"),
      }));

      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        attachments: formattedResendAttachments,
        html,
      });

      if (result.error) {
        console.error("[EMAIL_RESEND_ERROR]", result.error);
        return { success: false, provider: "resend", smtpError: smtpErrorDetails, resendError: result.error };
      }

      console.log("[EMAIL_SENT_RESEND_SUCCESS]", result.data);
      return { success: true, provider: "resend", data: result.data };
    } catch (err: any) {
      console.error("[EMAIL_RESEND_EXCEPTION]", err?.message || err);
      return { success: false, provider: "resend", smtpError: smtpErrorDetails, resendError: err?.message };
    }
  }

  // Return exact error if neither provider succeeded
  return {
    success: false,
    provider: smtpErrorDetails ? "smtp" : "none",
    smtpError: smtpErrorDetails || "SMTP credentials (SMTP_USER/SMTP_PASS) or RESEND_API_KEY missing in environment variables",
  };
}
