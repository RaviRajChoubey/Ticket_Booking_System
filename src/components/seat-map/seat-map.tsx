"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Info } from "lucide-react";

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

interface SeatMapProps {
  seats: Seat[];
  currentUserId?: string;
  heldByCurrentUser?: string[]; // seat IDs held by current user
  selectedSeats?: string[];
  onSeatSelect?: (seatId: string) => void;
  maxSelectable?: number;
}

export function SeatMap({
  seats,
  currentUserId,
  heldByCurrentUser = [],
  selectedSeats = [],
  onSeatSelect,
  maxSelectable = 8,
}: SeatMapProps) {
  const rows = Math.max(...seats.map((s) => s.row));
  const cols = Math.max(...seats.map((s) => s.col));
  const rowLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const getSeatStatus = (seat: Seat): "available" | "held-other" | "held-mine" | "booked" | "selected" => {
    if (selectedSeats.includes(seat.id)) return "selected";
    if (seat.status === "BOOKED") return "booked";
    if (seat.status === "HELD") {
      return heldByCurrentUser.includes(seat.id) ? "held-mine" : "held-other";
    }
    return "available";
  };

  const handleSeatClick = (seat: Seat) => {
    const status = getSeatStatus(seat);
    if (!onSeatSelect) return;
    if (status === "booked" || status === "held-other") return;
    if (status === "selected" || status === "held-mine") {
      onSeatSelect(seat.id); // deselect
      return;
    }
    if (selectedSeats.length >= maxSelectable) return;
    onSeatSelect(seat.id);
  };

  const categories = [...new Set(seats.map((s) => s.category))];
  const categoryColors: Record<string, string> = {
    Premium: "text-amber-400",
    Standard: "text-blue-400",
    VIP: "text-violet-400",
    Economy: "text-green-400",
  };

  return (
    <div className="space-y-6">
      {/* Screen / Stage */}
      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="w-3/4 h-2 bg-gradient-to-r from-transparent via-violet-500 to-transparent rounded-full opacity-80" />
        <div className="w-2/3 h-12 rounded-lg border border-violet-500/30 bg-violet-950/20 flex items-center justify-center">
          <span className="text-xs text-violet-400 font-medium tracking-widest uppercase">SCREEN / STAGE</span>
        </div>
      </div>

      {/* Seat Grid */}
      <div className="overflow-x-auto pb-4">
        <div className="inline-block min-w-full">
          {Array.from({ length: rows }, (_, rowIdx) => {
            const rowLetter = rowLabels[rowIdx] || `R${rowIdx + 1}`;
            const rowSeats = seats.filter((s) => s.row === rowIdx + 1).sort((a, b) => a.col - b.col);
            const rowCategory = rowSeats[0]?.category || "Standard";

            return (
              <div key={rowIdx} className="flex items-center gap-2 mb-1.5">
                {/* Row label */}
                <div className={`w-6 text-center text-xs font-bold shrink-0 ${categoryColors[rowCategory] || "text-slate-400"}`}>
                  {rowLetter}
                </div>
                {/* Seats */}
                <div className="flex gap-1 flex-1 justify-center">
                  {rowSeats.map((seat, seatIdx) => {
                    const status = getSeatStatus(seat);
                    return (
                      <button
                        key={seat.id}
                        id={`seat-${seat.id}`}
                        onClick={() => handleSeatClick(seat)}
                        title={`${seat.label} — ${seat.category} — ₹${seat.price} — ${status}`}
                        className={`
                          w-7 h-7 text-[9px] font-bold rounded-t-lg rounded-b-sm
                          transition-all duration-150 select-none
                          ${status === "available" ? "seat-available" : ""}
                          ${status === "held-other" ? "seat-held-other" : ""}
                          ${status === "booked" ? "seat-booked" : ""}
                          ${status === "selected" ? "seat-selected" : ""}
                          ${status === "held-mine" ? "seat-held-mine" : ""}
                          ${seatIdx === Math.floor(rowSeats.length / 2) - 1 ? "mr-4" : ""}
                        `}
                      >
                        {seat.col}
                      </button>
                    );
                  })}
                </div>
                {/* Row label right */}
                <div className={`w-6 text-center text-xs font-bold shrink-0 ${categoryColors[rowCategory] || "text-slate-400"}`}>
                  {rowLetter}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center pt-4 border-t border-white/10">
        {[
          { label: "Available", className: "seat-available w-5 h-5" },
          { label: "Selected", className: "seat-selected w-5 h-5" },
          { label: "Held by Others", className: "seat-held-other w-5 h-5" },
          { label: "Booked", className: "seat-booked w-5 h-5" },
        ].map(({ label, className }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`rounded-t-md rounded-b-sm ${className}`} />
            <span className="text-xs text-slate-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Category pricing */}
      <div className="flex flex-wrap gap-3 justify-center">
        {categories.map((cat) => {
          const catSeat = seats.find((s) => s.category === cat);
          return (
            <div key={cat} className="px-3 py-1.5 rounded-full glass text-xs flex items-center gap-2">
              <span className={categoryColors[cat] || "text-slate-300"}>{cat}</span>
              <span className="text-slate-500">•</span>
              <span className="text-white font-medium">₹{catSeat?.price}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
