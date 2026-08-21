import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis, seatHoldKey, SEAT_HOLD_TTL_SECONDS } from "@/lib/redis";
import { z } from "zod";
import { apiError, apiSuccess, unauthorized, conflict } from "@/lib/api-response";

const holdSchema = z.object({
  eventId: z.string().min(1),
  seatIds: z.array(z.string()).min(1).max(10),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const userId = session.user.id;
    const body = await request.json();
    const parsed = holdSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }

    const { eventId, seatIds } = parsed.data;

    // Verify event exists and is published
    const event = await prisma.event.findUnique({
      where: { id: eventId, status: "PUBLISHED" },
    });
    if (!event) return apiError("Event not found or not available", "EVENT_NOT_FOUND", 404);

    // Verify all seats exist, belong to this event, and are AVAILABLE
    const seats = await prisma.seat.findMany({
      where: { id: { in: seatIds }, eventId, status: "AVAILABLE" },
    });

    if (seats.length !== seatIds.length) {
      return conflict("One or more seats are no longer available");
    }

    // Atomic Redis SET NX for each seat (concurrency protection)
    const holdExpiry = new Date(Date.now() + SEAT_HOLD_TTL_SECONDS * 1000);
    const pipeline = redis.pipeline();

    for (const seatId of seatIds) {
      pipeline.set(seatHoldKey(eventId, seatId), userId, {
        nx: true,       // only set if NOT EXISTS
        ex: SEAT_HOLD_TTL_SECONDS,
      });
    }

    const results = await pipeline.exec();

    // Check if all Redis SETs succeeded
    const failedSeats: string[] = [];
    results.forEach((result, i) => {
      if (result === null) {
        failedSeats.push(seatIds[i]);
      }
    });

    if (failedSeats.length > 0) {
      // Release any holds we just set (rollback)
      const rollbackPipeline = redis.pipeline();
      for (let i = 0; i < results.length; i++) {
        if (results[i] !== null) {
          rollbackPipeline.del(seatHoldKey(eventId, seatIds[i]));
        }
      }
      await rollbackPipeline.exec();

      return conflict("One or more seats were just taken. Please refresh and try again.");
    }

    // Update DB — mark seats as HELD with expiry
    await prisma.seat.updateMany({
      where: { id: { in: seatIds } },
      data: {
        status: "HELD",
        holdByUserId: userId,
        holdExpiresAt: holdExpiry,
      },
    });

    return apiSuccess({
      message: "Seats held successfully",
      heldSeatIds: seatIds,
      expiresAt: holdExpiry.toISOString(),
      ttlSeconds: SEAT_HOLD_TTL_SECONDS,
    });
  } catch (error) {
    console.error("[SEATS_HOLD]", error);
    return apiError("Failed to hold seats", "INTERNAL_ERROR", 500);
  }
}
