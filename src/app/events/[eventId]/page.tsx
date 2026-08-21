import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Calendar, MapPin, Film, Music, Users, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EventBooking } from "@/components/events/event-booking";
import { WaitlistJoin } from "@/components/events/waitlist-join";

async function getEvent(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      venue: true,
      organiser: { select: { name: true } },
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
  return event;
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) return notFound();

  const isSoldOut =
    event.seats.filter((s) => s.status === "AVAILABLE").length === 0 &&
    event.status !== "DRAFT";

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

  return (
    <div className="min-h-screen">
      {/* Back */}
      <div className="max-w-7xl mx-auto px-4 pt-8 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Events
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left — Event info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Poster */}
            <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 relative">
              {event.imageUrl ? (
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {event.type === "MOVIE" ? (
                    <Film className="w-24 h-24 text-slate-700" />
                  ) : (
                    <Music className="w-24 h-24 text-slate-700" />
                  )}
                </div>
              )}
              <div className="absolute top-4 left-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold
                  ${event.type === "MOVIE" ? "bg-blue-600 text-white" : "bg-violet-600 text-white"}`}>
                  {event.type}
                </span>
              </div>
            </div>

            {/* Details card */}
            <div className="glass rounded-2xl p-6 border border-white/10 space-y-4">
              <h1 className="text-2xl font-bold text-white">{event.title}</h1>
              {event.description && (
                <p className="text-sm text-slate-400 leading-relaxed">{event.description}</p>
              )}

              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-violet-400 shrink-0" />
                  <span className="text-slate-300">
                    {format(new Date(event.date), "EEEE, MMMM d, yyyy · h:mm a")}
                  </span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-medium">{event.venue.name}</div>
                    <div className="text-slate-400 text-xs mt-0.5">{event.venue.address}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Users className="w-4 h-4 text-violet-400 shrink-0" />
                  <span className="text-slate-300">By {event.organiser.name}</span>
                </div>
              </div>

              {/* Category pricing */}
              <div className="pt-2 border-t border-white/10">
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide font-medium">Pricing</p>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div key={cat.name} className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">{cat.name}</span>
                      <span className="font-semibold text-white">₹{cat.price}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seat availability stats */}
              <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-3 text-center">
                <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl py-2">
                  <div className="text-lg font-bold text-emerald-400">{seatStats.available}</div>
                  <div className="text-xs text-slate-500">Available</div>
                </div>
                <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl py-2">
                  <div className="text-lg font-bold text-amber-400">{seatStats.held}</div>
                  <div className="text-xs text-slate-500">On Hold</div>
                </div>
                <div className="bg-red-950/30 border border-red-500/20 rounded-xl py-2">
                  <div className="text-lg font-bold text-red-400">{seatStats.booked}</div>
                  <div className="text-xs text-slate-500">Booked</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Seat map + booking */}
          <div className="lg:col-span-2">
            <div className="glass rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-6">Select Your Seats</h2>

              {isSoldOut ? (
                <div className="text-center py-12 space-y-4">
                  <div className="text-6xl">😔</div>
                  <h3 className="text-xl font-bold text-white">Sold Out</h3>
                  <p className="text-slate-400">All seats have been booked.</p>
                  <WaitlistJoin
                    eventId={event.id}
                    categories={categories.map((c) => c.name)}
                  />
                </div>
              ) : (
                <EventBooking
                  event={{ id: event.id, title: event.title, status: event.status }}
                  seats={event.seats as any}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
