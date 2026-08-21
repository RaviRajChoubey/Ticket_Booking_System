import Link from "next/link";
import { Suspense } from "react";
import { Calendar, MapPin, Star, Ticket, Zap, Shield, Clock } from "lucide-react";
import { EventCard } from "@/components/events/event-card";
import { EventFilters } from "@/components/events/event-filters";
import { prisma } from "@/lib/prisma";

async function getEvents(searchParams: { type?: string; search?: string }) {
  const where: any = { status: "PUBLISHED" };
  if (searchParams.type) where.type = searchParams.type;
  if (searchParams.search) where.title = { contains: searchParams.search, mode: "insensitive" };

  const events = await prisma.event.findMany({
    where,
    include: {
      venue: true,
      _count: { select: { seats: true } },
    },
    orderBy: { date: "asc" },
    take: 12,
  });

  return events;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { type?: string; search?: string };
}) {
  const events = await getEvents(searchParams);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-16 pb-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-violet-500/30 text-violet-300 text-sm font-medium mb-6">
            <Zap className="w-3.5 h-3.5" />
            Real-time seat selection
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-tight mb-6">
            Book <span className="gradient-text">tickets</span><br />
            that matter
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Movies, concerts, and live events — with real-time seat maps,
            instant QR code tickets, and smart waitlists so you never miss out.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="#events"
              className="px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-900/40 hover:shadow-violet-900/60 hover:-translate-y-0.5"
            >
              Browse Events
            </Link>
            <Link
              href="/auth/register"
              className="px-8 py-4 glass border border-white/10 hover:border-white/20 text-white font-semibold rounded-xl transition-all hover:-translate-y-0.5"
            >
              Get Started Free
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-3xl mx-auto mt-16 grid grid-cols-3 gap-6 relative z-10">
          {[
            { value: "10K+", label: "Events booked" },
            { value: "99.9%", label: "Uptime SLA" },
            { value: "<1s", label: "Seat hold time" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center glass rounded-2xl py-6 border border-white/10">
              <div className="text-3xl font-extrabold gradient-text">{value}</div>
              <div className="text-sm text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features strip */}
      <section className="border-y border-white/5 bg-white/[0.02] py-10">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { icon: Shield, title: "Concurrency-Safe", desc: "Redis atomic locks prevent double-booking" },
            { icon: Clock, title: "Auto Hold & Release", desc: "10-min hold TTL, auto-release on abandonment" },
            { icon: Ticket, title: "QR Code Tickets", desc: "Instant QR code emailed on confirmation" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="text-sm text-slate-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Events Section */}
      <section id="events" className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">Upcoming Events</h2>
            <p className="text-slate-400 mt-1">
              {events.length} events available
            </p>
          </div>
          <EventFilters />
        </div>

        {events.length === 0 ? (
          <div className="text-center py-24">
            <Ticket className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-400">No events found</h3>
            <p className="text-slate-500 mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event as any} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
