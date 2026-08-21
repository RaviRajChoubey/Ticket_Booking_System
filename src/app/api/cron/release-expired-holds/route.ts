import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis, seatHoldKey } from "@/lib/redis";
import { processWaitlistForCategory } from "@/lib/waitlist";
import { apiSuccess, apiError } from "@/lib/api-response";

/**
 * Vercel Cron Job — runs every minute
 * Releases seats whose hold TTL has expired
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return apiError("Unauthorized", "UNAUTHORIZED", 401);
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

    // Release each expired seat
    await prisma.seat.updateMany({
      where: { id: { in: expiredSeats.map((s) => s.id) } },
      data: { status: "AVAILABLE", holdByUserId: null, holdExpiresAt: null },
    });

    // Clean up any lingering Redis keys
    const pipeline = redis.pipeline();
    for (const seat of expiredSeats) {
      pipeline.del(seatHoldKey(seat.eventId, seat.id));
    }
    await pipeline.exec();

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
