import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { processWaitlistForCategory } from "@/lib/waitlist";
import { apiSuccess, apiError } from "@/lib/api-response";

/**
 * Cron Job — runs periodically or via request
 * Releases seats whose hold TTL has expired and offers to waitlist
 */
export async function GET(request: NextRequest) {
  // Verify cron secret if provided in environment
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // allow dev execution if no header passed
    const isDev = process.env.NODE_ENV !== "production";
    if (!isDev) {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }
  }

  try {
    const now = new Date();

    // Find all seats that are HELD but TTL has expired
    const expiredSeats = await prisma.seat.findMany({
      where: {
        status: "HELD",
        holdExpiresAt: { lt: now },
      },
      select: { id: true, eventId: true, category: true, label: true },
    });

    if (expiredSeats.length === 0) {
      return apiSuccess({ message: "No expired holds found", released: 0 });
    }

    console.log(`[CRON] Releasing ${expiredSeats.length} expired holds`);

    // Release each expired seat in DB
    await prisma.seat.updateMany({
      where: { id: { in: expiredSeats.map((s) => s.id) } },
      data: { status: "AVAILABLE", holdByUserId: null, holdExpiresAt: null },
    });

    // Best-effort Redis cleanup
    try {
      const url = process.env.UPSTASH_REDIS_REST_URL ?? "";
      const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
      if (url && token && token !== "********" && !url.includes("YOUR")) {
        const { redis, seatHoldKey } = await import("@/lib/redis");
        const pipeline = redis.pipeline();
        for (const seat of expiredSeats) {
          pipeline.del(seatHoldKey(seat.eventId, seat.id));
        }
        await pipeline.exec();
      }
    } catch {
      // Ignore Redis errors
    }

    // Process waitlist for each unique event+category combination
    const combinations = [
      ...new Map(expiredSeats.map((s) => [`${s.eventId}:${s.category}`, s])).values(),
    ];

    for (const combo of combinations) {
      await processWaitlistForCategory(combo.eventId, combo.category);
    }

    return apiSuccess({
      message: "Expired holds released",
      released: expiredSeats.length,
      seats: expiredSeats.map((s) => s.label),
    });
  } catch (error) {
    console.error("[CRON_RELEASE_HOLDS]", error);
    return apiError("Cron job failed", "INTERNAL_ERROR", 500);
  }
}
