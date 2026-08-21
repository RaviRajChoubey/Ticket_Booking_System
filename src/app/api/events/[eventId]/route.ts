import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, notFound } from "@/lib/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        venue: true,
        organiser: { select: { id: true, name: true, email: true } },
        seats: {
          orderBy: [{ row: "asc" }, { col: "asc" }],
          select: {
            id: true,
            row: true,
            col: true,
            label: true,
            category: true,
            price: true,
            status: true,
            holdExpiresAt: true,
          },
        },
      },
    });

    if (!event) return notFound("Event");

    // Group seats by category for pricing info
    const categories = [
      ...new Map(
        event.seats.map((s) => [s.category, { name: s.category, price: s.price }])
      ).values(),
    ];

    const seatStats = {
      total: event.seats.length,
      available: event.seats.filter((s) => s.status === "AVAILABLE").length,
      held: event.seats.filter((s) => s.status === "HELD").length,
      booked: event.seats.filter((s) => s.status === "BOOKED").length,
    };

    return apiSuccess({ event: { ...event, categories, seatStats } });
  } catch (error) {
    console.error("[EVENT_DETAIL]", error);
    return apiError("Failed to fetch event", "INTERNAL_ERROR", 500);
  }
}
