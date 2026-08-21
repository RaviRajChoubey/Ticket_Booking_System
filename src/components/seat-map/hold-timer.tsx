"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface HoldTimerProps {
  expiresAt: string; // ISO string
  onExpired: () => void;
}

export function HoldTimer({ expiresAt, onExpired }: HoldTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    const calc = () => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setSecondsLeft(0);
        onExpired();
      } else {
        setSecondsLeft(diff);
      }
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isUrgent = secondsLeft < 120;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium
        ${isUrgent
          ? "bg-red-950/40 border-red-500/40 text-red-300 animate-pulse"
          : "bg-amber-950/30 border-amber-500/30 text-amber-300"
        }`}
    >
      {isUrgent ? (
        <AlertTriangle className="w-4 h-4 shrink-0" />
      ) : (
        <Clock className="w-4 h-4 shrink-0" />
      )}
      <span>
        Seats held for{" "}
        <span className="font-bold tabular-nums">
          {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
      </span>
    </div>
  );
}
