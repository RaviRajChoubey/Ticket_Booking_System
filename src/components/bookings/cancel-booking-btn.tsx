"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, XCircle } from "lucide-react";

export function CancelBookingBtn({ bookingRef }: { bookingRef: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setIsCancelling(true);
    setError(null);

    const res = await fetch(`/api/bookings/${bookingRef}`, { method: "DELETE" });
    const data = await res.json();
    setIsCancelling(false);

    if (!res.ok) {
      setError(data.message || "Failed to cancel booking");
      setConfirming(false);
      return;
    }

    router.refresh();
  };

  return (
    <div className="pt-4 border-t border-white/10">
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
      {!confirming ? (
        <button
          id="cancel-booking-btn"
          onClick={() => setConfirming(true)}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          <XCircle className="w-4 h-4" />
          Cancel Booking
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Are you sure? This will release your seats and trigger waitlist notifications.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirming(false)}
              className="px-4 py-2 text-sm text-slate-400 border border-white/10 rounded-xl hover:border-white/20 transition-all"
            >
              Keep Booking
            </button>
            <button
              id="confirm-cancel"
              onClick={handleCancel}
              disabled={isCancelling}
              className="px-4 py-2 text-sm text-white bg-red-700 hover:bg-red-600 disabled:opacity-50 rounded-xl transition-all flex items-center gap-2"
            >
              {isCancelling ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Cancelling...</>
              ) : (
                "Yes, Cancel"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
