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

  // 1. Try Nodemailer SMTP if configured (Gmail App Password, Brevo, or custom SMTP)
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `TicketHub <${smtpUser}>`,
        to,
        subject,
        html,
        attachments,
      });

      console.log("[EMAIL_SENT_SMTP]", info.messageId);
      return { success: true, provider: "smtp", messageId: info.messageId };
    } catch (err: any) {
      console.error("[EMAIL_SMTP_ERROR]", err?.message || err);
    }
  }

  // 2. Try Resend API
  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      attachments,
      html,
    });

    if (result.error) {
      console.error("[EMAIL_RESEND_ERROR]", result.error);
      return { success: false, provider: "resend", error: result.error };
    }

    console.log("[EMAIL_SENT_RESEND]", result.data);
    return { success: true, provider: "resend", data: result.data };
  } catch (err: any) {
    console.error("[EMAIL_RESEND_EXCEPTION]", err?.message || err);
    return { success: false, provider: "resend", error: err?.message };
  }
}
