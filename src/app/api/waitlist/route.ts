import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiError, apiSuccess, unauthorized } from "@/lib/api-response";

const waitlistSchema = z.object({
  eventId: z.string().min(1),
  category: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const userId = session.user.id;
    const body = await request.json();
    const parsed = waitlistSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }

    const { eventId, category } = parsed.data;

    // Check if already on waitlist
    const existing = await prisma.waitlist.findFirst({
      where: {
        userId,
        eventId,
        category,
        status: { in: ["WAITING", "OFFERED"] },
      },
    });

    if (existing) {
      return apiError("You are already on the waitlist for this category", "ALREADY_WAITLISTED", 409);
    }

    // Get current queue length for position
    const count = await prisma.waitlist.count({
      where: { eventId, category, status: { in: ["WAITING", "OFFERED"] } },
    });

    const entry = await prisma.waitlist.create({
      data: {
        userId,
        eventId,
        category,
        position: count + 1,
        status: "WAITING",
      },
    });

    return apiSuccess({
      message: "Added to waitlist",
      position: entry.position,
      waitlistId: entry.id,
    }, 201);
  } catch (error) {
    console.error("[WAITLIST_JOIN]", error);
    return apiError("Failed to join waitlist", "INTERNAL_ERROR", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();

    const waitlist = await prisma.waitlist.findMany({
      where: { userId: session.user.id },
      include: { event: { include: { venue: true } }, offeredSeat: true },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess({ waitlist });
  } catch (error) {
    console.error("[WAITLIST_GET]", error);
    return apiError("Failed to fetch waitlist", "INTERNAL_ERROR", 500);
  }
}
