import Link from "next/link";
import { Suspense } from "react";
import { Calendar, MapPin, Ticket, Shield, Clock, Play, Music, Sparkles, ChevronRight } from "lucide-react";
import { EventCard } from "@/components/events/event-card";
import { EventFilters } from "@/components/events/event-filters";
import { prisma } from "@/lib/prisma";

async function getEvents(searchParams: { type?: string; search?: string }) {
  try {
    const where: any = { status: "PUBLISHED" };
    if (searchParams.type) where.type = searchParams.type;
    if (searchParams.search) where.title = { contains: searchParams.search, mode: "insensitive" };

    const events = await prisma.event.findMany({
      where,
      include: {
        venue: true,
        seats: { select: { id: true, status: true } },
        _count: { select: { seats: true } },
      },
      orderBy: { date: "asc" },
    });

    return events.map((e) => ({
      ...e,
      availableSeats: e.seats.filter((s) => s.status === "AVAILABLE").length,
    }));
  } catch (error) {
    console.error("[GET_EVENTS_ERROR]", error);
    return [];
  }
}

const getHeroGradient = (title: string = "") => {
  if (title.includes("Coldplay"))     return "from-fuchsia-900 via-purple-900 to-indigo-950";
  if (title.includes("Rahman"))       return "from-amber-900 via-orange-950 to-red-950";
  if (title.includes("Interstellar")) return "from-blue-950 via-indigo-950 to-slate-950";
  if (title.includes("Inception"))    return "from-cyan-950 via-blue-950 to-slate-950";
  if (title.includes("Dune"))         return "from-amber-950 via-red-950 to-stone-950";
  return "from-violet-950 via-indigo-950 to-slate-950";
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; search?: string }>;
}) {
  const resolvedParams = await searchParams;
  const allEvents = await getEvents(resolvedParams);

  const movies   = allEvents.filter((e) => e.type === "MOVIE");
  const concerts = allEvents.filter((e) => e.type === "CONCERT");
  const featuredEvent = allEvents[2] || allEvents[0];

  return (
    <div className="min-h-screen bg-[hsl(222,47%,6%)] text-white overflow-x-hidden">

      {/* ══════════════════════════════════════════════════════
          HERO BANNER (FEATURED EVENT)
      ══════════════════════════════════════════════════════ */}
      {featuredEvent && (
        <section className={`relative w-full overflow-hidden bg-gradient-to-br ${getHeroGradient(featuredEvent.title)} border-b border-white/10`}>
          {/* Subtle noise/grid backdrop pattern */}
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Centered Max-Width Container */}
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              {/* Left Column: Hero Content */}
              <div className="lg:col-span-7 space-y-5">
                {/* Category Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-white text-xs sm:text-sm font-semibold tracking-wide uppercase">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span>Featured Event</span>
                </div>

                {/* Main Hero Heading */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight drop-shadow-lg">
                  {featuredEvent.title}
                </h1>

                {/* Date & Venue Metadata */}
                <div className="flex flex-wrap items-center gap-4 text-sm sm:text-base text-slate-300">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-violet-400" />
                    <span>{new Date(featuredEvent.date).toLocaleDateString("en-IN", { dateStyle: "full" })}</span>
                  </div>
                  <span className="text-slate-500">•</span>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-violet-400" />
                    <span>{featuredEvent.venue.name}</span>
                  </div>
                </div>

                {/* Event Description */}
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl line-clamp-2">
                  {featuredEvent.description || "Experience the magic of this highly anticipated show. Premium seats available with real-time seat allocation."}
                </p>

                {/* Call to Action Buttons */}
                <div className="flex flex-wrap gap-4 pt-2">
                  <Link
                    href={`/events/${featuredEvent.id}`}
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl transition-all shadow-lg shadow-violet-900/50 hover:scale-[1.02]"
                  >
                    <Ticket className="w-5 h-5" />
                    <span>Book Tickets Now</span>
                  </Link>
                  <Link
                    href="#movies"
                    className="inline-flex items-center gap-2 px-6 py-3.5 text-sm sm:text-base font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl backdrop-blur-md transition-all"
                  >
                    <span>Browse All</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Right Column: Featured Visual Preview Card */}
              <div className="lg:col-span-5 hidden sm:block">
                <div className="glass-card rounded-2xl p-6 border border-white/15 relative overflow-hidden shadow-2xl group">
                  <div className="aspect-[16/9] rounded-xl overflow-hidden bg-slate-900 relative mb-4">
                    {featuredEvent.imageUrl ? (
                      <img
                        src={featuredEvent.imageUrl}
                        alt={featuredEvent.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-600/40 to-indigo-900/60 flex items-center justify-center">
                        {featuredEvent.type === "MOVIE" ? (
                          <Play className="w-16 h-16 text-white/60 fill-white/20" />
                        ) : (
                          <Music className="w-16 h-16 text-white/60" />
                        )}
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-red-600 text-white font-bold text-xs px-2.5 py-1 rounded-md shadow">
                      LIVE BOOKING
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-bold text-white text-base">{featuredEvent.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{featuredEvent.venue.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Available Seats</div>
                      <div className="font-bold text-emerald-400 text-base">{featuredEvent.availableSeats} Left</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          STICKY FILTER BAR
      ══════════════════════════════════════════════════════ */}
      <div className="sticky top-16 sm:top-20 z-30 bg-[hsl(222,47%,6%)]/95 backdrop-blur-xl border-b border-white/10 shadow-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Suspense fallback={<div className="h-10 w-64 bg-white/5 rounded-xl animate-pulse" />}>
            <EventFilters />
          </Suspense>

          <div className="hidden lg:flex items-center gap-6 text-xs sm:text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Protected Booking</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-violet-400" />
              <span>10-Min Seat Hold</span>
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MAIN CONTENT AREA
      ══════════════════════════════════════════════════════ */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 space-y-12 lg:space-y-16">

        {/* ── RECOMMENDED MOVIES SECTION ── */}
        {movies.length > 0 && (
          <section id="movies" className="space-y-6">
            <div className="flex items-end justify-between pb-3.5 border-b border-white/10">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>🎬 Recommended Movies</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Blockbuster films showing at premium venues near you
                </p>
              </div>
              <Link
                href="/?type=MOVIE"
                className="text-xs sm:text-sm font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
              >
                <span>See All</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Grid Layout: 3–4 columns on desktop naturally filling screen */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {movies.map((event) => (
                <EventCard key={event.id} event={event as any} />
              ))}
            </div>
          </section>
        )}

        {/* ── MUSIC & LIVE CONCERTS SECTION ── */}
        {concerts.length > 0 && (
          <section id="concerts" className="space-y-6">
            <div className="flex items-end justify-between pb-3.5 border-b border-white/10">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>🎵 Music & Live Concerts</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Catch your favourite artists live on stage
                </p>
              </div>
              <Link
                href="/?type=CONCERT"
                className="text-xs sm:text-sm font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
              >
                <span>See All</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {concerts.map((event) => (
                <EventCard key={event.id} event={event as any} />
              ))}
            </div>
          </section>
        )}

        {/* ── EMPTY STATE ── */}
        {allEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center glass rounded-2xl border border-white/10">
            <Ticket className="w-16 h-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-white">No Events Found</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
              We couldn&apos;t find any events matching your filters. Try clearing filters or check back later!
            </p>
          </div>
        )}
      </main>

    </div>
  );
}
