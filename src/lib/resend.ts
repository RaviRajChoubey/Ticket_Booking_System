import { Resend } from "resend";

// Lazy initialization — only throws at runtime when actually used, not at build time
let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set");
    _resend = new Resend(apiKey);
  }
  return _resend;
}

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "tickets@tickethub.app";
export const APP_NAME = "TicketHub";
