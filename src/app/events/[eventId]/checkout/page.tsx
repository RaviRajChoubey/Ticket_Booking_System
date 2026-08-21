"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, ArrowLeft, CreditCard } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const checkoutSchema = z.object({
  cardName: z.string().min(2, "Name required"),
  cardNumber: z.string().regex(/^\d{16}$/, "Enter valid 16-digit card number"),
  expiry: z.string().regex(/^\d{2}\/\d{2}$/, "Format MM/YY"),
  cvv: z.string().regex(/^\d{3,4}$/, "Invalid CVV"),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function CheckoutPage({ params }: { params: { eventId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const seatIds = searchParams.get("seats")?.split(",") || [];

  const [seats, setSeats] = useState<any[]>([]);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutForm>({ resolver: zodResolver(checkoutSchema) });

  useEffect(() => {
    if (!seatIds.length) { router.push("/"); return; }
    fetch(`/api/events/${params.eventId}`)
      .then((r) => r.json())
      .then((data) => {
        setEvent(data.event);
        setSeats(data.event.seats.filter((s: any) => seatIds.includes(s.id)));
        setLoading(false);
      });
  }, [params.eventId]);

  const onSubmit = async (_formData: CheckoutForm) => {
    setIsBooking(true);
    setError(null);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: params.eventId, seatIds }),
    });

    const data = await res.json();
    setIsBooking(false);

    if (!res.ok) {
      setError(data.message || "Booking failed. Please try again.");
      return;
    }

    setBookingRef(data.booking.bookingRef);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (bookingRef) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
          <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Booking Confirmed! 🎉</h1>
          <p className="text-slate-400">
            Your QR code ticket has been sent to your email.
          </p>
          <div className="glass rounded-2xl p-4 border border-emerald-500/20">
            <div className="text-xs text-slate-500 mb-1">Booking Reference</div>
            <div className="font-mono text-lg font-bold text-violet-400">{bookingRef}</div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push(`/bookings/${bookingRef}`)}
              className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all"
            >
              View Ticket
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 glass border border-white/10 text-white font-semibold rounded-xl transition-all"
            >
              Browse More
            </button>
          </div>
        </div>
      </div>
    );
  }

  const total = seats.reduce((sum: number, s: any) => sum + s.price, 0);

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to seats
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div className="glass rounded-2xl p-6 border border-white/10 h-fit">
          <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>
          {event && (
            <div className="mb-6 pb-6 border-b border-white/10">
              <h3 className="font-semibold text-white">{event.title}</h3>
              <p className="text-sm text-slate-400 mt-1">{event.venue?.name}</p>
            </div>
          )}
          <div className="space-y-3 mb-6">
            {seats.map((seat: any) => (
              <div key={seat.id} className="flex justify-between items-center text-sm">
                <div>
                  <span className="text-white font-medium">{seat.label}</span>
                  <span className="text-slate-400 ml-2 text-xs">{seat.category}</span>
                </div>
                <span className="text-violet-400 font-semibold">₹{seat.price}</span>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-white/10 flex justify-between items-center">
            <span className="font-semibold text-white">Total</span>
            <span className="text-2xl font-bold text-white">₹{total}</span>
          </div>
        </div>

        {/* Payment Form */}
        <div className="glass rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="w-5 h-5 text-violet-400" />
            <h2 className="text-xl font-bold text-white">Payment Details</h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="bg-red-950/40 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {[
              { id: "cardName", label: "Name on Card", placeholder: "John Doe", type: "text" },
              { id: "cardNumber", label: "Card Number", placeholder: "1234567890123456", type: "text", maxLength: 16 },
            ].map(({ id, label, placeholder, type, maxLength }) => (
              <div key={id} className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">{label}</label>
                <input
                  {...register(id as any)}
                  id={id}
                  type={type}
                  placeholder={placeholder}
                  maxLength={maxLength}
                  className="w-full px-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all"
                />
                {errors[id as keyof CheckoutForm] && (
                  <p className="text-red-400 text-xs">{errors[id as keyof CheckoutForm]?.message}</p>
                )}
              </div>
            ))}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Expiry</label>
                <input
                  {...register("expiry")}
                  id="expiry"
                  type="text"
                  placeholder="MM/YY"
                  maxLength={5}
                  className="w-full px-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all"
                />
                {errors.expiry && <p className="text-red-400 text-xs">{errors.expiry.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">CVV</label>
                <input
                  {...register("cvv")}
                  id="cvv"
                  type="password"
                  placeholder="•••"
                  maxLength={4}
                  className="w-full px-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all"
                />
                {errors.cvv && <p className="text-red-400 text-xs">{errors.cvv.message}</p>}
              </div>
            </div>

            <div className="pt-2">
              <button
                id="confirm-payment"
                type="submit"
                disabled={isBooking}
                className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-lg shadow-lg shadow-violet-900/30"
              >
                {isBooking ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Confirming Booking...</>
                ) : (
                  `Pay ₹${total} & Confirm`
                )}
              </button>
              <p className="text-xs text-slate-500 text-center mt-3">
                🔒 Secured. Your QR ticket will be emailed instantly.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
