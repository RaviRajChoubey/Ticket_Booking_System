import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Ticket, Calendar, MapPin, XCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function MyBookingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const bookings = await prisma.booking.findMany({
    where: { userId: session.user.id },
    include: {
      event: { include: { venue: true } },
      seats: { include: { seat: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">My Tickets</h1>
        <p className="text-slate-400 mt-1">{bookings.length} booking{bookings.length !== 1 ? "s" : ""}</p>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-24 glass rounded-2xl border border-white/10">
          <Ticket className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-400">No bookings yet</h3>
          <p className="text-slate-500 mt-2 mb-6">Book your first event to see your tickets here.</p>
          <Link
            href="/"
            className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all"
          >
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Link
              href={`/bookings/${booking.bookingRef}`}
              key={booking.id}
              className="block glass rounded-2xl p-6 border border-white/10 hover:border-violet-500/30 transition-all hover:-translate-y-0.5 group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {booking.status === "CONFIRMED" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                      ${booking.status === "CONFIRMED"
                        ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-950/40 text-red-400 border border-red-500/20"
                      }`}>
                      {booking.status}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">#{booking.bookingRef.slice(-8)}</span>
                  </div>
                  <h3 className="font-bold text-white text-lg group-hover:text-violet-300 transition-colors">
                    {booking.event.title}
                  </h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-violet-400" />
                      {format(new Date(booking.event.date), "EEE, MMM d · h:mm a")}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-violet-400" />
                      {booking.event.venue.name}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {booking.seats.map((bs) => (
                      <span key={bs.seatId} className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-medium text-slate-300">
                        {bs.seat.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-white">₹{booking.totalAmount}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {booking.seats.length} seat{booking.seats.length > 1 ? "s" : ""}
                  </div>
                  <div className="text-xs text-violet-400 mt-2 group-hover:underline">View ticket →</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
