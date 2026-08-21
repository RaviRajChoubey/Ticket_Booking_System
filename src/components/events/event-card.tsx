import Link from "next/link";
import { format } from "date-fns";
import { Calendar, MapPin, Play, Music, ArrowRight } from "lucide-react";

type EventCardProps = {
  event: {
    id: string;
    title: string;
    type: string;
    date: string | Date;
    imageUrl?: string | null;
    status: string;
    venue: { name: string; address: string };
    _count: { seats: number };
    availableSeats?: number;
  };
};

const getCoverGradient = (title: string = "") => {
  if (title.includes("Coldplay"))     return "from-fuchsia-600 via-purple-700 to-indigo-900";
  if (title.includes("Rahman"))       return "from-amber-500 via-orange-600 to-red-800";
  if (title.includes("Interstellar")) return "from-blue-900 via-indigo-950 to-slate-950";
  if (title.includes("Inception"))    return "from-cyan-900 via-blue-950 to-slate-950";
  if (title.includes("Dune"))         return "from-amber-700 via-red-800 to-stone-950";
  return "from-violet-600 via-indigo-700 to-slate-900";
};

const getTag = (title: string) => {
  if (title.includes("Coldplay") || title.includes("Interstellar"))
    return { text: "🔥 Trending", cls: "bg-red-500 text-white" };
  if (title.includes("Rahman"))
    return { text: "⚡ Selling Fast", cls: "bg-amber-500 text-slate-950" };
  return { text: "Featured", cls: "bg-violet-600 text-white" };
};

export function EventCard({ event }: EventCardProps) {
  const isMovie = event.type === "MOVIE";
  const isSoldOut = event.availableSeats === 0;
  const dateObj = new Date(event.date);
  const tag = getTag(event.title);

  return (
    <Link
      href={`/events/${event.id}`}
      id={`event-card-${event.id}`}
      className="group flex flex-col h-full rounded-2xl overflow-hidden glass-card hover:border-violet-500/40 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-violet-950/30"
    >
      {/* ── POSTER ART ── */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[4/3] overflow-hidden bg-slate-900">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(event.title)} flex flex-col items-center justify-center p-6 relative`}>
            <div className="absolute inset-0 bg-black/20" />
            
            {/* Center icon badge */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl z-10 group-hover:scale-110 transition-transform">
              {isMovie ? (
                <Play className="w-7 h-7 sm:w-8 sm:h-8 text-white fill-white/40 ml-0.5" />
              ) : (
                <Music className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              )}
            </div>

            {/* Poster title overlay text */}
            <div className="z-10 text-center mt-3 max-w-[90%]">
              <span className="text-white/90 font-bold text-sm sm:text-base leading-snug line-clamp-1 block drop-shadow-md">
                {event.title.split("(")[0].trim()}
              </span>
              <span className="text-white/60 text-[10px] sm:text-xs font-semibold uppercase tracking-wider block mt-0.5">
                {isMovie ? "Movie Premiere" : "Live Concert"}
              </span>
            </div>
          </div>
        )}

        {/* Top Status Tag */}
        <div className="absolute top-3 left-3 z-10">
          <span className={`px-2.5 py-1 rounded-md text-xs font-bold shadow-md tracking-wide ${tag.cls}`}>
            {tag.text}
          </span>
        </div>

        {/* Sold Out Overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex items-center justify-center">
            <span className="text-red-400 font-black text-sm sm:text-base border-2 border-red-500/80 px-4 py-1.5 rounded-xl -rotate-6 tracking-widest uppercase bg-slate-950/60 shadow-lg">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* ── CARD CONTENT ── */}
      <div className="p-5 flex flex-col justify-between flex-1 space-y-4">
        <div className="space-y-2">
          {/* Title */}
          <h3 className="font-bold text-base sm:text-lg text-white leading-snug line-clamp-1 group-hover:text-violet-300 transition-colors">
            {event.title}
          </h3>

          {/* Date & Venue */}
          <div className="space-y-1.5 text-xs sm:text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-400 shrink-0" />
              <span className="truncate">{format(dateObj, "EEE, MMM d · h:mm a")}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-violet-400 shrink-0" />
              <span className="truncate">{event.venue.name}</span>
            </div>
          </div>
        </div>

        {/* Footer: Seats Availability + Action CTA */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 text-xs sm:text-sm">
          {typeof event.availableSeats === "number" && !isSoldOut ? (
            <span className="font-bold px-2.5 py-1 rounded-md text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
              {event.availableSeats} seats left
            </span>
          ) : isSoldOut ? (
            <span className="font-medium px-2.5 py-1 rounded-md text-slate-400 bg-white/5">
              Waitlist Open
            </span>
          ) : (
            <span className="font-semibold text-slate-400">Filling Fast</span>
          )}

          <span className="font-bold text-violet-400 group-hover:text-violet-300 transition-colors flex items-center gap-1">
            Book Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}
