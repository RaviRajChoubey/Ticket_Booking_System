import QRCode from "qrcode";

/**
 * Generates a base64-encoded PNG QR code from a booking reference
 */
export async function generateQRCode(bookingRef: string): Promise<string> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/bookings/${bookingRef}`;
  const dataUrl = await QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
  return dataUrl;
}

/**
 * Generates a raw PNG Buffer for email CID attachments
 */
export async function generateQRBuffer(bookingRef: string): Promise<Buffer> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/bookings/${bookingRef}`;
  return QRCode.toBuffer(url, {
    width: 300,
    margin: 2,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}
