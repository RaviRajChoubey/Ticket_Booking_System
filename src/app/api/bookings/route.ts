import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateQRCode, generateQRBuffer } from "@/lib/qr";
import { APP_NAME } from "@/lib/resend";
import { sendTicketEmail } from "@/lib/email";
import { z } from "zod";
import { apiError, apiSuccess, unauthorized, conflict } from "@/lib/api-response";

const bookingSchema = z.object({
  eventId: z.string().min(1),
  seatIds: z.array(z.string()).min(1).max(10),
  paymentMethod: z.string().optional().default("UPI"),
  idempotencyKey: z.string().optional(),
});

async function isRedisAvailable(): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
  return Boolean(url && token && token !== "********" && !url.includes("YOUR"));
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const userId = session.user.id;
    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Please select at least 1 seat to complete booking", "VALIDATION_ERROR");
    }

    const { eventId, seatIds } = parsed.data;
    const redisOk = await isRedisAvailable();

    // Use a Prisma transaction with row-level locking for concurrency safety
    const booking = await prisma.$transaction(async (tx) => {
      // SELECT FOR UPDATE — lock these seat rows
      const seats = await tx.$queryRaw<Array<{ id: string; status: string; holdByUserId: string | null; holdExpiresAt: Date | null; price: number; label: string; category: string }>>`
        SELECT id, status, "holdByUserId", "holdExpiresAt", price, label, category
        FROM "Seat"
        WHERE id = ANY(${seatIds}::text[]) AND "eventId" = ${eventId}
        FOR UPDATE
      `;

      if (seats.length !== seatIds.length) {
        throw new Error("One or more seats not found");
      }

      // Verify all seats are HELD by this user and not expired in DB
      const now = new Date();
      for (const seat of seats) {
        if (seat.status !== "HELD" || seat.holdByUserId !== userId) {
          throw new Error(`Seat ${seat.label} is no longer held by you`);
        }
        if (seat.holdExpiresAt && seat.holdExpiresAt < now) {
          throw new Error(`Seat hold expired for ${seat.label}`);
        }
      }

      // Double-check Redis keys if Redis is configured
      if (redisOk) {
        try {
          const { redis, seatHoldKey } = await import("@/lib/redis");
          for (const seat of seats) {
            const redisOwner = await redis.get(seatHoldKey(eventId, seat.id));
            if (redisOwner && redisOwner !== userId) {
              throw new Error(`Seat hold expired for ${seat.label}`);
            }
          }
        } catch (e: any) {
          if (e.message?.includes("expired")) throw e;
          // Ignore Redis connection/auth errors and rely on DB transaction lock
        }
      }

      const totalAmount = seats.reduce((sum, s) => sum + s.price, 0);

      // Create booking
      const newBooking = await tx.booking.create({
        data: {
          userId,
          eventId,
          totalAmount,
          status: "CONFIRMED",
          seats: {
            create: seats.map((s) => ({ seatId: s.id })),
          },
        },
        include: {
          event: { include: { venue: true } },
          user: true,
          seats: { include: { seat: true } },
        },
      });

      // Mark seats as BOOKED
      await tx.seat.updateMany({
        where: { id: { in: seatIds } },
        data: { status: "BOOKED", holdByUserId: null, holdExpiresAt: null },
      });

      return newBooking;
    }, { maxWait: 10000, timeout: 15000 });

    // Release Redis hold keys (outside transaction) if Redis is available
    if (redisOk) {
      try {
        const { redis, seatHoldKey } = await import("@/lib/redis");
        const pipeline = redis.pipeline();
        for (const seatId of seatIds) {
          pipeline.del(seatHoldKey(eventId, seatId));
        }
        await pipeline.exec();
      } catch {
        // Ignore Redis release failure
      }
    }

    // Generate QR code (base64 dataUrl for local DB & raw Buffer for email)
    let qrCodeData = "";
    let qrBuffer: Buffer | null = null;
    try {
      qrCodeData = await generateQRCode(booking.bookingRef);
      qrBuffer = await generateQRBuffer(booking.bookingRef);

      await prisma.booking.update({
        where: { id: booking.id },
        data: { qrCodeData },
      });
    } catch (qrErr) {
      console.error("[QR_GEN_ERROR]", qrErr);
    }

    // Send confirmation email via Resend
    try {
      const seatLabels = booking.seats.map((bs) => bs.seat.label).join(", ");
      const eventDate = new Date(booking.event.date).toLocaleString("en-IN", {
        dateStyle: "full",
        timeStyle: "short",
      });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://ticket-booking-system-opal.vercel.app");
      const bookingUrl = `${baseUrl}/bookings/${booking.bookingRef}`;
      // Reliable HTTPS QR Code image URL for Gmail proxy rendering
      const emailQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(bookingUrl)}`;

      const attachments: any[] = [];
      if (qrBuffer) {
        attachments.push({
          filename: `ticket-qr-${booking.bookingRef.slice(-6)}.png`,
          content: qrBuffer,
        });
      }

      await sendTicketEmail({
        to: booking.user.email,
        subject: `🎟️ Booking Confirmed — ${booking.event.title}`,
        attachments,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #070b14; color: #f8fafc; padding: 36px 28px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
            
            <!-- Header -->
            <div style="text-align: center; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <div style="display: inline-block; padding: 8px 16px; background: rgba(52,211,153,0.15); border: 1px solid rgba(52,211,153,0.3); border-radius: 999px; color: #34d399; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px;">
                ✓ Booking Confirmed
              </div>
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 900; margin: 0 0 6px;">${booking.event.title}</h1>
              <p style="color: #94a3b8; font-size: 14px; margin: 0;">Hi ${booking.user.name}, your ticket is confirmed!</p>
            </div>

            <!-- Show Details Card -->
            <div style="background: #0f172a; padding: 24px; border-radius: 14px; margin: 24px 0; border: 1px solid rgba(255,255,255,0.08);">
              <div style="margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.06);">
                <div style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Venue / Location</div>
                <div style="color: #ffffff; font-size: 16px; font-weight: 700;">📍 ${booking.event.venue.name}</div>
                <div style="color: #94a3b8; font-size: 13px; margin-top: 2px;">${booking.event.venue.address}</div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                  <div style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Date & Time</div>
                  <div style="color: #f1f5f9; font-size: 14px; font-weight: 600;">📅 ${eventDate}</div>
                </div>
                <div>
                  <div style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Your Seats</div>
                  <div style="color: #a78bfa; font-size: 15px; font-weight: 800;">💺 ${seatLabels}</div>
                </div>
              </div>

              <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b; font-size: 12px; font-family: monospace;">Ref: ${booking.bookingRef}</span>
                <span style="color: #34d399; font-size: 18px; font-weight: 900;">Total: ₹${booking.totalAmount}</span>
              </div>
            </div>

            <!-- HTTPS QR Code Ticket (Guaranteed Gmail proxy rendering) -->
            <div style="text-align: center; margin: 28px 0; padding: 24px 20px; background: #0f172a; border-radius: 14px; border: 1px solid rgba(255,255,255,0.08);">
              <p style="color: #94a3b8; font-size: 13px; font-weight: 600; margin: 0 0 16px;">Entry Ticket — Show at Venue</p>
              <div style="display: inline-block; padding: 12px; background: #ffffff; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.6);">
                <img src="${emailQrUrl}" alt="QR Code Ticket" width="200" height="200" style="display: block; width: 200px; height: 200px; border: none; outline: none;" />
              </div>
              <p style="color: #64748b; font-size: 12px; margin: 14px 0 0;">Scan this QR code at the entrance for direct entry.</p>
            </div>

            <!-- View Booking Button & Direct Link -->
            <div style="text-align: center; margin-top: 24px;">
              <a href="${bookingUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #ffffff; 
                        padding: 14px 32px; border-radius: 12px; text-decoration: none; font-size: 15px; font-weight: 700;
                        box-shadow: 0 4px 16px rgba(124,58,237,0.4);">
                View Full Ticket Online
              </a>
              <div style="margin-top: 14px; font-size: 11px; color: #64748b; word-break: break-all;">
                Direct link: <a href="${bookingUrl}" style="color: #a78bfa; text-decoration: underline;">${bookingUrl}</a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: #475569;">
              Thank you for choosing ${APP_NAME}! Need help? Contact support.
            </div>
          </div>
        `,
      });
    } catch (emailErr: any) {
      console.error("[EMAIL_SEND_ERROR]", emailErr?.message || emailErr);
    }

    return apiSuccess({
      booking: {
        id: booking.id,
        bookingRef: booking.bookingRef,
        status: booking.status,
        totalAmount: booking.totalAmount,
        qrCodeData,
        event: booking.event,
        seats: booking.seats.map((bs) => bs.seat),
      },
    }, 201);
  } catch (error: any) {
    console.error("[BOOKINGS_CREATE]", error);
    if (error.message?.includes("no longer held") || error.message?.includes("hold expired")) {
      return conflict(error.message);
    }
    return apiError("Booking failed: " + (error.message || "Internal error"), "INTERNAL_ERROR", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const bookings = await prisma.booking.findMany({
      where: { userId: session.user.id },
      include: {
        event: { include: { venue: true } },
        seats: { include: { seat: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess({ bookings });
  } catch (error) {
    console.error("[BOOKINGS_GET]", error);
    return apiError("Failed to fetch bookings", "INTERNAL_ERROR", 500);
  }
}
