import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Protected route groups
  const isAuthRoute = pathname.startsWith("/auth");
  const isCustomerRoute = pathname.startsWith("/bookings") || pathname.startsWith("/events");
  const isOrganiserRoute = pathname.startsWith("/organiser");
  const isAdminRoute = pathname.startsWith("/admin");
  const isCronRoute = pathname.startsWith("/api/cron");

  // Protect cron routes with secret
  if (isCronRoute) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Redirect logged-in users away from auth pages
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Redirect guests from protected pages
  if ((isCustomerRoute || isOrganiserRoute || isAdminRoute) && !session) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Role guards
  if (isOrganiserRoute && session?.user?.role !== "ORGANISER" && session?.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isAdminRoute && session?.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
