import QRCode from "qrcode";

/**
 * Generates a base64-encoded PNG QR code from a booking reference
 */
export async function generateQRCode(bookingRef: string): Promise<string> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/bookings/${bookingRef}`;
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
