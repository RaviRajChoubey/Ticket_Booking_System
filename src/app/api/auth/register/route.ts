import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { apiError, apiSuccess } from "@/lib/api-response";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
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

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return apiError("Email already registered", "EMAIL_EXISTS", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, hashedPassword, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return apiSuccess({ user, message: "Registration successful" }, 201);
  } catch (error) {
    console.error("[REGISTER]", error);
    return apiError("Registration failed", "INTERNAL_ERROR", 500);
  }
}
