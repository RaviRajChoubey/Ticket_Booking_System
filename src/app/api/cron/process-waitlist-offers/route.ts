import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis, seatHoldKey } from "@/lib/redis";
import { processWaitlistForCategory } from "@/lib/waitlist";
import { apiSuccess, apiError } from "@/lib/api-response";

/**
 * Vercel Cron Job — runs every minute
 * Checks for OFFERED waitlist entries whose offer has expired,
 * releases the held seat, and offers to the next person in queue.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return apiError("Unauthorized", "UNAUTHORIZED", 401);
  }

  try {
    const now = new Date();

    // Find expired waitlist offers
    const expiredOffers = await prisma.waitlist.findMany({
      where: {
        status: "OFFERED",
        offerExpiresAt: { lt: now },
      },
      include: { event: true },
    });

    if (expiredOffers.length === 0) {
      return apiSuccess({ message: "No expired offers", processed: 0 });
    }

    console.log(`[CRON] Processing ${expiredOffers.length} expired waitlist offers`);

    for (const offer of expiredOffers) {
      // Mark offer as expired
      await prisma.waitlist.update({
        where: { id: offer.id },
        data: { status: "EXPIRED", offeredSeatId: null, offerToken: null, offerExpiresAt: null },
      });

      // Release the held seat back to available
      if (offer.offeredSeatId) {
        await prisma.seat.update({
          where: { id: offer.offeredSeatId },
          data: { status: "AVAILABLE", holdByUserId: null, holdExpiresAt: null },
        });
        await redis.del(seatHoldKey(offer.eventId, offer.offeredSeatId));
      }

      // Offer to next person in waitlist
      await processWaitlistForCategory(offer.eventId, offer.category);
    }

    return apiSuccess({ message: "Expired offers processed", processed: expiredOffers.length });
  } catch (error) {
    console.error("[CRON_WAITLIST_OFFERS]", error);
    return apiError("Cron job failed", "INTERNAL_ERROR", 500);
  }
}
