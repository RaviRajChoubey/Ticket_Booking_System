import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { Calendar, MapPin, Ticket, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { CancelBookingBtn } from "@/components/bookings/cancel-booking-btn";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ bookingRef: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  const { bookingRef } = await params;

  const booking = await prisma.booking.findUnique({
    where: { bookingRef },
    include: {
      event: { include: { venue: true } },
      seats: { include: { seat: true } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!booking) return notFound();
  if (booking.userId !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/");
  }

  const isCancelled = booking.status === "CANCELLED";
  const isPast = new Date(booking.event.date) < new Date();

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/bookings"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        My Tickets
      </Link>

      {/* Status banner */}
      <div className={`mb-6 px-5 py-3 rounded-xl text-sm font-medium flex items-center gap-2
        ${isCancelled
          ? "bg-red-950/40 border border-red-500/30 text-red-300"
          : "bg-emerald-950/30 border border-emerald-500/20 text-emerald-300"
        }`}>
        <Ticket className="w-4 h-4" />
        {isCancelled ? "This booking has been cancelled" : "Booking Confirmed ✓"}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Details */}
        <div className="glass rounded-2xl p-6 border border-white/10 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-white">{booking.event.title}</h1>
            <p className="text-xs text-slate-500 mt-1 font-mono">Ref: {booking.bookingRef}</p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-violet-400 shrink-0" />
              <span className="text-slate-300">
                {format(new Date(booking.event.date), "EEEE, MMMM d, yyyy · h:mm a")}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-white">{booking.event.venue.name}</div>
                <div className="text-slate-400 text-xs">{booking.event.venue.address}</div>
              </div>
            </div>
          </div>

          {/* Seats */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-xs text-slate-500 mb-3 uppercase tracking-wide font-medium">Seats</p>
            <div className="flex flex-wrap gap-2">
              {booking.seats.map((bs) => (
                <div key={bs.seatId} className="px-3 py-2 rounded-xl bg-slate-800 border border-white/10">
                  <div className="font-bold text-white">{bs.seat.label}</div>
                  <div className="text-xs text-slate-400">{bs.seat.category} · ₹{bs.seat.price}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="pt-4 border-t border-white/10 flex justify-between items-center">
            <span className="text-slate-400">Total Paid</span>
            <span className="text-2xl font-bold text-white">₹{booking.totalAmount}</span>
          </div>

          {/* Actions */}
          {!isCancelled && !isPast && (
            <CancelBookingBtn bookingRef={booking.bookingRef} />
          )}
        </div>

        {/* QR Code */}
        <div className="glass rounded-2xl p-6 border border-white/10 flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-slate-400 font-medium">Your QR Ticket</p>
          {booking.qrCodeData ? (
            <>
              <div className="p-3 bg-white rounded-2xl shadow-xl">
                <img
                  src={booking.qrCodeData}
                  alt="QR Code Ticket"
                  className="w-52 h-52"
                />
              </div>
              <p className="text-xs text-slate-500 max-w-xs">
                Show this QR code at the venue for entry. You can view or download your ticket anytime here.
              </p>
              <a
                href={booking.qrCodeData}
                download={`ticket-${booking.bookingRef}.png`}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-violet-400 hover:text-violet-300 border border-violet-500/30 rounded-xl transition-all hover:bg-violet-950/30"
              >
                <Download className="w-4 h-4" />
                Download QR
              </a>
            </>
          ) : (
            <div className="w-52 h-52 rounded-2xl bg-slate-800 flex items-center justify-center">
              <Ticket className="w-16 h-16 text-slate-600" />
            </div>
          )}
          {isCancelled && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60">
              <span className="text-red-400 font-bold text-lg border-2 border-red-400 px-4 py-2 rounded-lg rotate-[-10deg]">
                CANCELLED
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
