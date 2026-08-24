import { NextRequest, NextResponse } from "next/server";
import { sendTicketEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const to = searchParams.get("to") || "test@example.com";

  const result = await sendTicketEmail({
    to,
    subject: "🎟️ TicketHub — Diagnostic Email Test",
    html: `
      <div style="font-family: sans-serif; padding: 24px; background: #070b14; color: #fff; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
        <h2 style="color: #a78bfa; margin-top: 0;">🎟️ TicketHub Email Test</h2>
        <p>If you receive this email, your TicketHub email engine is working 100% perfectly!</p>
        <p style="color: #94a3b8; font-size: 13px;">Timestamp: ${new Date().toLocaleString()}</p>
      </div>
    `,
  });

  return NextResponse.json({
    recipient: to,
    envCheck: {
      hasSmtpUser: Boolean(process.env.SMTP_USER || process.env.GMAIL_USER),
      smtpUserValue: (process.env.SMTP_USER || process.env.GMAIL_USER || "").slice(0, 5) + "***",
      hasSmtpPass: Boolean(process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD),
      smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
      smtpPort: process.env.SMTP_PORT || "465",
      hasResendKey: Boolean(process.env.RESEND_API_KEY),
      resendFrom: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    },
    result,
  });
}
