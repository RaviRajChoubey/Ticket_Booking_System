import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis, seatHoldKey } from "@/lib/redis";
import { z } from "zod";
import { apiError, apiSuccess, unauthorized } from "@/lib/api-response";
import { processWaitlistForCategory } from "@/lib/waitlist";

const releaseSchema = z.object({
  eventId: z.string().min(1),
  seatIds: z.array(z.string()).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const userId = session.user.id;
    const body = await request.json();
    const parsed = releaseSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }

    const { eventId, seatIds } = parsed.data;

    // Verify these seats are held by this user
    const seats = await prisma.seat.findMany({
      where: {
        id: { in: seatIds },
        eventId,
        holdByUserId: userId,
        status: "HELD",
      },
    });

    if (seats.length === 0) {
      return apiError("No held seats found for this user", "NOT_FOUND", 404);
    }

    // Delete Redis keys
    const pipeline = redis.pipeline();
    for (const seat of seats) {
      pipeline.del(seatHoldKey(eventId, seat.id));
    }
    await pipeline.exec();

    // Update DB
    await prisma.seat.updateMany({
      where: { id: { in: seats.map((s) => s.id) } },
      data: { status: "AVAILABLE", holdByUserId: null, holdExpiresAt: null },
    });

    // Trigger waitlist processing for each unique category released
    const categories = [...new Set(seats.map((s) => s.category))];
    for (const category of categories) {
      await processWaitlistForCategory(eventId, category);
    }

    return apiSuccess({ message: "Seats released successfully", releasedCount: seats.length });
  } catch (error) {
    console.error("[SEATS_RELEASE]", error);
    return apiError("Failed to release seats", "INTERNAL_ERROR", 500);
  }
}
