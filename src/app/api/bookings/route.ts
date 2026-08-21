import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis, seatHoldKey } from "@/lib/redis";
import { generateQRCode } from "@/lib/qr";
import { getResend, FROM_EMAIL, APP_NAME } from "@/lib/resend";
import { z } from "zod";
import { apiError, apiSuccess, unauthorized, conflict } from "@/lib/api-response";

const bookingSchema = z.object({
  eventId: z.string().min(1),
  seatIds: z.array(z.string()).min(1).max(10),
  idempotencyKey: z.string().optional(), // prevent double submit
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const userId = session.user.id;
    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }

    const { eventId, seatIds } = parsed.data;

    // Use a Prisma transaction with row-level locking for concurrency safety
    const booking = await prisma.$transaction(async (tx) => {
      // SELECT FOR UPDATE — lock these seat rows
      const seats = await tx.$queryRaw<Array<{ id: string; status: string; holdByUserId: string | null; price: number; label: string; category: string }>>`
        SELECT id, status, "holdByUserId", price, label, category
        FROM "Seat"
        WHERE id = ANY(${seatIds}::text[]) AND "eventId" = ${eventId}
        FOR UPDATE
      `;

      // Verify all seats are HELD by this user
      for (const seat of seats) {
        if (seat.status !== "HELD" || seat.holdByUserId !== userId) {
          throw new Error(`Seat ${seat.label} is no longer held by you`);
        }
      }

      if (seats.length !== seatIds.length) {
        throw new Error("One or more seats not found");
      }

      // Double-check Redis keys still belong to this user
      for (const seat of seats) {
        const redisOwner = await redis.get(seatHoldKey(eventId, seat.id));
        if (redisOwner !== userId) {
          throw new Error(`Seat hold expired for ${seat.label}`);
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
          event: true,
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
    });

    // Release Redis hold keys (outside transaction)
    const pipeline = redis.pipeline();
    for (const seatId of seatIds) {
      pipeline.del(seatHoldKey(eventId, seatId));
    }
    await pipeline.exec();

    // Generate QR code
    const qrCodeData = await generateQRCode(booking.bookingRef);

    // Update booking with QR code
    await prisma.booking.update({
      where: { id: booking.id },
      data: { qrCodeData },
    });

    // Send confirmation email with QR code
    const seatLabels = booking.seats.map((bs) => bs.seat.label).join(", ");
    const eventDate = new Date(booking.event.date).toLocaleString("en-IN", {
      dateStyle: "full",
      timeStyle: "short",
    });

    await getResend().emails.send({
      from: FROM_EMAIL,
      to: booking.user.email,
      subject: `🎟️ Booking Confirmed — ${booking.event.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 32px; border-radius: 12px;">
          <h1 style="color: #a78bfa; margin-bottom: 8px;">Booking Confirmed! ✅</h1>
          <p style="color: #94a3b8;">Hi ${booking.user.name}, your booking is confirmed.</p>
          
          <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #f8fafc; margin: 0 0 12px;">${booking.event.title}</h2>
            <p style="margin: 4px 0; color: #94a3b8;">📅 ${eventDate}</p>
            <p style="margin: 4px 0; color: #94a3b8;">💺 Seats: <strong style="color: #f8fafc;">${seatLabels}</strong></p>
            <p style="margin: 4px 0; color: #94a3b8;">💰 Total: <strong style="color: #a78bfa;">₹${booking.totalAmount}</strong></p>
            <p style="margin: 4px 0; color: #94a3b8;">🔖 Ref: <strong style="color: #f8fafc;">${booking.bookingRef}</strong></p>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <p style="color: #94a3b8; margin-bottom: 12px;">Your QR Code Ticket</p>
            <img src="${qrCodeData}" alt="QR Code" style="width: 200px; height: 200px; background: white; padding: 8px; border-radius: 8px;" />
          </div>

          <a href="${process.env.NEXT_PUBLIC_APP_URL}/bookings/${booking.bookingRef}" 
             style="display: block; text-align: center; background: #7c3aed; color: white; 
                    padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px;">
            View Booking Details
          </a>
          
          <p style="color: #475569; font-size: 12px; text-align: center; margin-top: 24px;">— ${APP_NAME} Team</p>
        </div>
      `,
    });

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
    return apiError("Booking failed", "INTERNAL_ERROR", 500);
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
