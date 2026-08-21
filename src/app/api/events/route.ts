import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiError, apiSuccess, unauthorized, forbidden } from "@/lib/api-response";

const eventSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  type: z.enum(["MOVIE", "CONCERT"]),
  venueId: z.string().min(1),
  date: z.string().datetime(),
  imageUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    if (session.user.role !== "ORGANISER" && session.user.role !== "ADMIN") return forbidden();

    const body = await request.json();
    const parsed = eventSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }

    const { title, description, type, venueId, date, imageUrl } = parsed.data;

    // Fetch venue to generate seats
    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) return apiError("Venue not found", "NOT_FOUND", 404);

    const categories = venue.categories as Array<{
      name: string;
      rows: number[];
      price: number;
    }>;

    // Create event with all seats generated from venue layout
    const event = await prisma.$transaction(async (tx) => {
      const newEvent = await tx.event.create({
        data: {
          title,
          description,
          type,
          venueId,
          organiserId: session.user.id,
          date: new Date(date),
          imageUrl,
          status: "PUBLISHED",
        },
      });

      // Generate seats based on venue layout
      const seatsToCreate = [];
      const rowLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

      for (let row = 0; row < venue.totalRows; row++) {
        const rowLetter = rowLabels[row] || `R${row + 1}`;
        // Find which category this row belongs to
        const category = categories.find((c) => c.rows.includes(row + 1));
        const catName = category?.name || "Standard";
        const price = category?.price || 200;

        for (let col = 1; col <= venue.totalCols; col++) {
          seatsToCreate.push({
            eventId: newEvent.id,
            row: row + 1,
            col,
            label: `${rowLetter}${col}`,
            category: catName,
            price,
            status: "AVAILABLE" as const,
          });
        }
      }

      await tx.seat.createMany({ data: seatsToCreate });

      return newEvent;
    });

    return apiSuccess({ event }, 201);
  } catch (error) {
    console.error("[EVENTS_CREATE]", error);
    return apiError("Failed to create event", "INTERNAL_ERROR", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");

    const where: any = { status: "PUBLISHED" };
    if (type) where.type = type;
    if (search) where.title = { contains: search, mode: "insensitive" };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          venue: true,
          _count: { select: { seats: true } },
        },
        orderBy: { date: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    // Add available seat count to each event
    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const availableCount = await prisma.seat.count({
          where: { eventId: event.id, status: "AVAILABLE" },
        });
        return { ...event, availableSeats: availableCount };
      })
    );

    return apiSuccess({
      events: eventsWithCounts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[EVENTS_GET]", error);
    return apiError("Failed to fetch events", "INTERNAL_ERROR", 500);
  }
}
