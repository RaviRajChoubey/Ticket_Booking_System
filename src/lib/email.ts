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
  const rawSmtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || "";
  const rawSmtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "";

  const smtpUser = rawSmtpUser.trim();
  const smtpPass = rawSmtpPass.replace(/\s+/g, ""); // strip spaces from Google 16-char app passcodes

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

      const formattedAttachments = attachments?.map((a) => ({
        filename: a.filename,
        content: typeof a.content === "string" ? Buffer.from(a.content, "base64") : a.content,
      }));

      const info = await transporter.sendMail({
        from: `TicketHub <${smtpUser}>`,
        to,
        subject,
        html,
        attachments: formattedAttachments,
      });

      console.log("[EMAIL_SENT_SMTP_SUCCESS]", info.messageId);
      return { success: true, provider: "smtp", messageId: info.messageId };
    } catch (err: any) {
      console.error("[EMAIL_SMTP_ERROR]", err?.message || err);
      // Fall through to Resend if SMTP fails
    }
  }

  // 2. Try Resend API
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
      return { success: false, provider: "resend", error: result.error };
    }

    console.log("[EMAIL_SENT_RESEND_SUCCESS]", result.data);
    return { success: true, provider: "resend", data: result.data };
  } catch (err: any) {
    console.error("[EMAIL_RESEND_EXCEPTION]", err?.message || err);
    return { success: false, provider: "resend", error: err?.message };
  }
}
