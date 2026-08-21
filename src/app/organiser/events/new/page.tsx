"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft, Calendar, MapPin } from "lucide-react";
import Link from "next/link";

const eventSchema = z.object({
  title: z.string().min(2, "Title required"),
  description: z.string().optional(),
  type: z.enum(["MOVIE", "CONCERT"]),
  venueId: z.string().min(1, "Select a venue"),
  date: z.string().min(1, "Date required"),
});

type EventForm = z.infer<typeof eventSchema>;

export default function CreateEventPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: { type: "MOVIE" },
  });

  useEffect(() => {
    fetch("/api/venues").then(r => r.json()).then(d => setVenues(d.venues || []));
  }, []);

  const onSubmit = async (data: EventForm) => {
    setIsSubmitting(true);
    setError(null);

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, date: new Date(data.date).toISOString() }),
    });
    const json = await res.json();
    setIsSubmitting(false);

    if (!res.ok) { setError(json.message || "Failed to create event"); return; }
    router.push(`/organiser/dashboard`);
  };

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-10">
      <Link href="/organiser/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Dashboard
      </Link>

      <h1 className="text-3xl font-bold text-white mb-8">Create New Event</h1>

      <div className="glass rounded-2xl p-8 border border-white/10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div className="bg-red-950/40 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Event Title</label>
            <input {...register("title")} id="event-title" type="text" placeholder="e.g. Coldplay World Tour 2025"
              className="w-full px-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all" />
            {errors.title && <p className="text-red-400 text-xs">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Description (optional)</label>
            <textarea {...register("description")} id="event-desc" rows={3} placeholder="Event description..."
              className="w-full px-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all resize-none" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Event Type</label>
            <div className="grid grid-cols-2 gap-3">
              {["MOVIE", "CONCERT"].map((type) => (
                <label key={type} className="relative cursor-pointer">
                  <input {...register("type")} type="radio" value={type} className="sr-only peer" />
                  <div className="peer-checked:border-violet-500 peer-checked:bg-violet-950/40 border border-white/10 rounded-xl p-3 hover:border-white/20 transition-all text-center">
                    <span className="font-medium text-sm text-white">{type === "MOVIE" ? "🎬 Movie" : "🎵 Concert"}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><MapPin className="w-4 h-4 text-violet-400" /> Venue</label>
            <select {...register("venueId")} id="venue-select"
              className="w-full px-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-all">
              <option value="">Select a venue...</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>{v.name} — {v.address}</option>
              ))}
            </select>
            {errors.venueId && <p className="text-red-400 text-xs">{errors.venueId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Calendar className="w-4 h-4 text-violet-400" /> Date & Time</label>
            <input {...register("date")} id="event-date" type="datetime-local"
              className="w-full px-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-all" />
            {errors.date && <p className="text-red-400 text-xs">{errors.date.message}</p>}
          </div>

          <button id="create-event-submit" type="submit" disabled={isSubmitting}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 mt-2">
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create Event & Generate Seat Map"}
          </button>
        </form>
      </div>
    </div>
  );
}
