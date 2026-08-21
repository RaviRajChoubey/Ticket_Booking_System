"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Bell, Loader2, CheckCircle2 } from "lucide-react";

interface WaitlistJoinProps {
  eventId: string;
  categories: string[];
}

export function WaitlistJoin({ eventId, categories }: WaitlistJoinProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(categories[0] || "");
  const [isJoining, setIsJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!session) { router.push("/auth/login"); return; }
    setIsJoining(true);
    setError(null);

    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, category: selectedCategory }),
    });
    const data = await res.json();
    setIsJoining(false);

    if (!res.ok) {
      setError(data.message || "Failed to join waitlist");
      return;
    }

    setJoined(true);
    setPosition(data.position);
  };

  if (joined) {
    return (
      <div className="inline-flex flex-col items-center gap-2 px-6 py-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl">
        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        <div className="text-emerald-300 font-semibold">You're on the waitlist!</div>
        <div className="text-sm text-slate-400">
          Position <span className="font-bold text-white">#{position}</span> for {selectedCategory}
        </div>
        <p className="text-xs text-slate-500 text-center mt-1">
          We'll email you if a seat becomes available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-xs mx-auto">
      <p className="text-sm text-slate-400">Join the waitlist and we'll email you if a seat opens up.</p>

      {categories.length > 1 && (
        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-medium">Category</label>
          <select
            id="waitlist-category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}

      <button
        id="join-waitlist-btn"
        onClick={handleJoin}
        disabled={isJoining}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all"
      >
        {isJoining ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Joining...</>
        ) : (
          <><Bell className="w-4 h-4" /> Join Waitlist</>
        )}
      </button>
    </div>
  );
}
