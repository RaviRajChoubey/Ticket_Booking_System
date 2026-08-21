import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis, seatHoldKey } from "@/lib/redis";
import { processWaitlistForCategory } from "@/lib/waitlist";
import { apiError, apiSuccess, unauthorized, notFound, forbidden } from "@/lib/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingRef: string }> }
) {
  const { bookingRef } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const booking = await prisma.booking.findUnique({
      where: { bookingRef },
      include: {
        event: { include: { venue: true } },
        seats: { include: { seat: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) return notFound("Booking");

    // Only allow the owner or admin to view
    if (booking.userId !== session.user.id && session.user.role !== "ADMIN") {
      return forbidden();
    }

    return apiSuccess({ booking });
  } catch (error) {
    console.error("[BOOKING_GET]", error);
    return apiError("Failed to fetch booking", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookingRef: string }> }
) {
  const { bookingRef } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const booking = await prisma.booking.findUnique({
      where: { bookingRef },
      include: { seats: { include: { seat: true } } },
    });

    if (!booking) return notFound("Booking");
    if (booking.userId !== session.user.id) return forbidden();
    if (booking.status === "CANCELLED") {
      return apiError("Booking is already cancelled", "ALREADY_CANCELLED");
    }

    // Cancel booking and release seats in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });

      const seatIds = booking.seats.map((bs) => bs.seatId);
      await tx.seat.updateMany({
        where: { id: { in: seatIds } },
        data: { status: "AVAILABLE", holdByUserId: null, holdExpiresAt: null },
      });
    });

    // Release Redis keys (if any lingering)
    const pipeline = redis.pipeline();
    for (const bs of booking.seats) {
      pipeline.del(seatHoldKey(booking.eventId, bs.seatId));
    }
    await pipeline.exec();

    // Process waitlist for freed seat categories
    const categories = [...new Set(booking.seats.map((bs) => bs.seat.category))];
    for (const category of categories) {
      await processWaitlistForCategory(booking.eventId, category);
    }

    return apiSuccess({ message: "Booking cancelled successfully" });
  } catch (error) {
    console.error("[BOOKING_CANCEL]", error);
    return apiError("Failed to cancel booking", "INTERNAL_ERROR", 500);
  }
}
