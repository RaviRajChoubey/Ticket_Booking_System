import Link from "next/link";
import { format } from "date-fns";
import { Calendar, MapPin, Film, Music } from "lucide-react";

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

export function EventCard({ event }: EventCardProps) {
  const isMovie = event.type === "MOVIE";
  const isSoldOut = event.availableSeats === 0;
  const dateObj = new Date(event.date);

  return (
    <Link
      href={`/events/${event.id}`}
      id={`event-card-${event.id}`}
      className="group block glass rounded-2xl overflow-hidden border border-white/10 hover:border-violet-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-900/20"
    >
      {/* Image / Poster */}
      <div className="relative aspect-[3/4] bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isMovie ? (
              <Film className="w-20 h-20 text-slate-700" />
            ) : (
              <Music className="w-20 h-20 text-slate-700" />
            )}
          </div>
        )}

        {/* Type badge */}
        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold
          ${isMovie
            ? "bg-blue-600/80 text-white"
            : "bg-violet-600/80 text-white"
          }`}>
          {isMovie ? "Movie" : "Concert"}
        </div>

        {/* Sold out overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-red-400 font-bold text-lg border-2 border-red-400 px-4 py-1.5 rounded-lg rotate-[-10deg]">
              SOLD OUT
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-white text-base leading-tight line-clamp-2 group-hover:text-violet-300 transition-colors">
          {event.title}
        </h3>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5 shrink-0 text-violet-400" />
            <span>{format(dateObj, "EEE, MMM d · h:mm a")}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-violet-400" />
            <span className="line-clamp-1">{event.venue.name}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          {typeof event.availableSeats === "number" && !isSoldOut && (
            <span className="text-xs text-emerald-400 font-medium">
              {event.availableSeats} seats left
            </span>
          )}
          {isSoldOut && (
            <span className="text-xs text-red-400 font-medium">Join Waitlist</span>
          )}
          <div className="ml-auto px-3 py-1 text-xs font-semibold text-violet-300 bg-violet-950/50 rounded-full">
            Book Now →
          </div>
        </div>
      </div>
    </Link>
  );
}
