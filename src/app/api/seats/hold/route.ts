import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SEAT_HOLD_TTL_SECONDS } from "@/lib/redis";
import { z } from "zod";
import { apiError, apiSuccess, unauthorized, conflict } from "@/lib/api-response";

const holdSchema = z.object({
  eventId: z.string().min(1),
  seatIds: z.array(z.string()).min(1).max(10),
});

// Helper: try Redis pipeline, return null if Redis is not configured
async function tryRedisHold(eventId: string, seatIds: string[], userId: string) {
  try {
    const url   = process.env.UPSTASH_REDIS_REST_URL  ?? "";
    const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

    // Skip Redis if credentials are placeholders / missing
    if (!url || !token || token === "********" || url.includes("YOUR")) {
      return null; // signals "no redis, use DB-only mode"
    }

    const { redis, seatHoldKey } = await import("@/lib/redis");
    const pipeline = redis.pipeline();
    for (const seatId of seatIds) {
      pipeline.set(seatHoldKey(eventId, seatId), userId, { nx: true, ex: SEAT_HOLD_TTL_SECONDS });
    }
    const results = await pipeline.exec();
    return results;
  } catch {
    return null; // Redis unavailable → fallback to DB-only
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const userId = session.user.id;
    const body   = await request.json();
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

    // Verify seats are AVAILABLE
    const seats = await prisma.seat.findMany({
      where: { id: { in: seatIds }, eventId, status: "AVAILABLE" },
    });

    if (seats.length !== seatIds.length) {
      return conflict("One or more seats are no longer available");
    }

    const holdExpiry = new Date(Date.now() + SEAT_HOLD_TTL_SECONDS * 1000);

    // ── Try Redis atomic hold (best effort) ──
    const redisResults = await tryRedisHold(eventId, seatIds, userId);

    if (redisResults !== null) {
      // Redis is available — check for conflicts
      const { redis, seatHoldKey } = await import("@/lib/redis");
      const failedSeats: string[] = [];
      redisResults.forEach((result, i) => {
        if (result === null) failedSeats.push(seatIds[i]);
      });

      if (failedSeats.length > 0) {
        // Rollback succeeded holds
        const rb = redis.pipeline();
        redisResults.forEach((r, i) => {
          if (r !== null) rb.del(seatHoldKey(eventId, seatIds[i]));
        });
        await rb.exec();
        return conflict("One or more seats were just taken. Please refresh and try again.");
      }
    }

    // ── DB hold (always runs — source of truth) ──
    // Use a transaction to prevent race conditions even without Redis
    await prisma.$transaction(async (tx) => {
      // Re-check inside transaction
      const fresh = await tx.seat.findMany({
        where: { id: { in: seatIds }, status: "AVAILABLE" },
      });
      if (fresh.length !== seatIds.length) {
        throw new Error("SEAT_TAKEN");
      }
      await tx.seat.updateMany({
        where: { id: { in: seatIds } },
        data: { status: "HELD", holdByUserId: userId, holdExpiresAt: holdExpiry },
      });
    }, { maxWait: 10000, timeout: 15000 });

    return apiSuccess({
      message: "Seats held successfully",
      heldSeatIds: seatIds,
      expiresAt: holdExpiry.toISOString(),
      ttlSeconds: SEAT_HOLD_TTL_SECONDS,
    });

  } catch (error: any) {
    if (error?.message === "SEAT_TAKEN") {
      return conflict("One or more seats are no longer available. Please refresh.");
    }
    console.error("[SEATS_HOLD]", error);
    return apiError("Failed to hold seats", "INTERNAL_ERROR", 500);
  }
}
