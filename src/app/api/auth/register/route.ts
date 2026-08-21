import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { apiError, apiSuccess } from "@/lib/api-response";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["CUSTOMER", "ORGANISER"]).default("CUSTOMER"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }

    const { name, email, password, role } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return apiError("Email address is already registered. Please sign in instead.", "EMAIL_EXISTS", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        hashedPassword,
        role,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return apiSuccess({ user, message: "Registration successful" }, 201);
  } catch (error: any) {
    console.error("[REGISTER_ERROR]", error);
    return apiError(error?.message || "Registration failed. Please try again.", "INTERNAL_ERROR", 500);
  }
}
