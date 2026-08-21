import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { apiError, apiSuccess, unauthorized, forbidden } from "@/lib/api-response";

const venueSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(5),
  totalRows: z.number().min(1).max(30),
  totalCols: z.number().min(1).max(30),
  categories: z.array(
    z.object({
      name: z.string(),
      rows: z.array(z.number()),
      price: z.number().min(0),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorized();
    if (session.user.role !== "ADMIN") return forbidden();

    const body = await request.json();
    const parsed = venueSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }

    const venue = await prisma.venue.create({ data: parsed.data });

    return apiSuccess({ venue }, 201);
  } catch (error) {
    console.error("[VENUES_CREATE]", error);
    return apiError("Failed to create venue", "INTERNAL_ERROR", 500);
  }
}

export async function GET() {
  try {
    const venues = await prisma.venue.findMany({
      include: { _count: { select: { events: true } } },
      orderBy: { name: "asc" },
    });
    return apiSuccess({ venues });
  } catch (error) {
    console.error("[VENUES_GET]", error);
    return apiError("Failed to fetch venues", "INTERNAL_ERROR", 500);
  }
}
