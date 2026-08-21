"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SeatMap } from "@/components/seat-map/seat-map";
import { HoldTimer } from "@/components/seat-map/hold-timer";
import { ShoppingCart, Loader2, Users, CheckCircle2 } from "lucide-react";

type Seat = {
  id: string;
  row: number;
  col: number;
  label: string;
  category: string;
  price: number;
  status: "AVAILABLE" | "HELD" | "BOOKED";
  holdExpiresAt?: string | null;
};

interface EventBookingProps {
  event: {
    id: string;
    title: string;
    status: string;
  };
  seats: Seat[];
}

export function EventBooking({ event, seats: initialSeats }: EventBookingProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const [seats, setSeats] = useState<Seat[]>(initialSeats);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [heldSeatIds, setHeldSeatIds] = useState<string[]>([]);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSeatSelect = useCallback((seatId: string) => {
    setSelectedSeatIds((prev) =>
      prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]
    );
  }, []);

  const handleHoldSeats = async () => {
    if (!session) { router.push("/auth/login"); return; }
    if (selectedSeatIds.length === 0) return;
    setIsHolding(true);
    setError(null);

    const res = await fetch("/api/seats/hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: event.id, seatIds: selectedSeatIds }),
    });

    const data = await res.json();
    setIsHolding(false);

    if (!res.ok) {
      setError(data.message || "Failed to hold seats. Try again.");
      return;
    }

    setHeldSeatIds(selectedSeatIds);
    setHoldExpiresAt(data.expiresAt);
    setSelectedSeatIds([]);

    // Update local seat state to show as HELD
    setSeats((prev) =>
      prev.map((s) =>
        selectedSeatIds.includes(s.id)
          ? { ...s, status: "HELD", holdExpiresAt: data.expiresAt }
          : s
      )
    );
  };

  const handleReleaseHold = async () => {
    if (heldSeatIds.length === 0) return;
    await fetch("/api/seats/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: event.id, seatIds: heldSeatIds }),
    });
    setHeldSeatIds([]);
    setHoldExpiresAt(null);
    setSeats((prev) =>
      prev.map((s) =>
        heldSeatIds.includes(s.id) ? { ...s, status: "AVAILABLE", holdExpiresAt: null } : s
      )
    );
  };

  const handleProceedToCheckout = () => {
    router.push(
      `/events/${event.id}/checkout?seats=${heldSeatIds.join(",")}`
    );
  };

  const selectedSeatsData = seats.filter((s) => selectedSeatIds.includes(s.id));
  const heldSeatsData = seats.filter((s) => heldSeatIds.includes(s.id));
  const totalPrice = heldSeatsData.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="space-y-6">
      {/* Hold timer */}
      {holdExpiresAt && (
        <HoldTimer
          expiresAt={holdExpiresAt}
          onExpired={handleReleaseHold}
        />
      )}

      {error && (
        <div className="bg-red-950/40 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Seat Map */}
      <SeatMap
        seats={seats}
        currentUserId={session?.user?.id}
        heldByCurrentUser={heldSeatIds}
        selectedSeats={selectedSeatIds}
        onSeatSelect={heldSeatIds.length > 0 ? undefined : handleSeatSelect}
        maxSelectable={8}
      />

      {/* Bottom action panel */}
      {heldSeatIds.length > 0 ? (
        <div className="glass rounded-2xl p-6 border border-violet-500/30 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            {heldSeatIds.length} seat{heldSeatIds.length > 1 ? "s" : ""} held for you
          </div>
          <div className="flex flex-wrap gap-2">
            {heldSeatsData.map((s) => (
              <span key={s.id} className="px-3 py-1.5 rounded-lg bg-violet-950/50 border border-violet-500/30 text-sm font-medium text-violet-300">
                {s.label} · ₹{s.price}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div>
              <div className="text-sm text-slate-400">Total</div>
              <div className="text-2xl font-bold text-white">₹{totalPrice}</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReleaseHold}
                className="px-4 py-2.5 text-sm text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all"
              >
                Release
              </button>
              <button
                id="proceed-checkout"
                onClick={handleProceedToCheckout}
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-violet-900/30"
              >
                <ShoppingCart className="w-4 h-4" />
                Checkout
              </button>
            </div>
          </div>
        </div>
      ) : selectedSeatIds.length > 0 ? (
        <div className="glass rounded-2xl p-6 border border-white/10 space-y-4">
          <div className="flex flex-wrap gap-2">
            {selectedSeatsData.map((s) => (
              <span key={s.id} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-sm font-medium">
                {s.label} · <span className="text-violet-400">₹{s.price}</span>
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              {selectedSeatIds.length} selected ·{" "}
              <span className="text-white font-semibold">
                ₹{selectedSeatsData.reduce((sum, s) => sum + s.price, 0)}
              </span>
            </div>
            <button
              id="hold-seats-btn"
              onClick={handleHoldSeats}
              disabled={isHolding}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
            >
              {isHolding ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Holding...</>
              ) : (
                "Hold Seats (10 min)"
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-slate-500 text-sm">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
          Click seats to select them, then hold for 10 minutes while you checkout
        </div>
      )}
    </div>
  );
}
