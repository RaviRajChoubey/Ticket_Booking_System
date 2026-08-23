"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import { Loader2, CheckCircle2, ArrowLeft, CreditCard, QrCode, Building2, Wallet, Lock, ShieldCheck, AlertCircle } from "lucide-react";

type PaymentMethod = "UPI" | "CARD" | "NETBANKING" | "WALLET";

export default function CheckoutPage({ params }: { params: Promise<{ eventId: string }> | { eventId: string } }) {
  const resolvedParams = typeof (params as any)?.then === "function" ? use(params as Promise<{ eventId: string }>) : (params as { eventId: string });
  const eventId = resolvedParams?.eventId;

  const router = useRouter();
  const searchParams = useSearchParams();
  const seatIds = searchParams.get("seats")?.split(",").filter(Boolean) || [];

  const [seats, setSeats] = useState<any[]>([]);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("UPI");

  // Form states — start blank so user can fill without deleting dummy text
  const [upiId, setUpiId] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");
  const [selectedWallet, setSelectedWallet] = useState("Paytm Wallet");

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    fetch(`/api/events/${eventId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.event) {
          setEvent(data.event);
          if (seatIds.length > 0 && Array.isArray(data.event.seats)) {
            const matched = data.event.seats.filter((s: any) => seatIds.includes(s.id));
            setSeats(matched);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [eventId]);

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || seatIds.length === 0) {
      setError("No seats selected for checkout. Please select and hold your seats first.");
      return;
    }

    setIsBooking(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          seatIds,
          paymentMethod,
        }),
      });

      const data = await res.json();
      setIsBooking(false);

      if (!res.ok) {
        setError(data.message || "Booking failed. Please try again.");
        return;
      }

      setBookingRef(data.booking.bookingRef);
    } catch (err: any) {
      setIsBooking(false);
      setError("Payment processing failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(222,47%,6%)] text-white">
        <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (bookingRef) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(222,47%,6%)] px-4 py-20">
        <div className="max-w-md w-full text-center glass rounded-3xl p-8 sm:p-10 border border-violet-500/30">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-3">Booking Confirmed! 🎉</h1>
          <p className="text-sm text-slate-400 mb-6">
            Your QR code ticket has been generated and confirmed.
          </p>
          <div className="bg-slate-900/80 rounded-2xl p-5 mb-7 border border-emerald-500/20">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Booking Reference</div>
            <div className="font-mono text-2xl font-black text-violet-400">{bookingRef}</div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push(`/bookings/${bookingRef}`)}
              className="px-6 py-3.5 text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all shadow-lg shadow-violet-900/40"
            >
              View Ticket & QR
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3.5 text-sm font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/15 rounded-xl transition-all"
            >
              Home Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  const total = seats.reduce((sum: number, s: any) => sum + s.price, 0);
  const hasNoSeats = seatIds.length === 0 || seats.length === 0;

  return (
    <div className="min-h-screen bg-[hsl(222,47%,6%)] text-white">
      {/* Container with top padding to prevent overlap with fixed top navbar */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 md:pt-32 pb-16">
        
        {/* Back Button - Clear margin & spacing below navbar */}
        <button
          onClick={() => eventId ? router.push(`/events/${eventId}`) : router.push("/")}
          className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold text-slate-400 hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to seat map</span>
        </button>

        {hasNoSeats && (
          <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-red-950/30 border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
            <div className="flex-1">
              <div className="text-base font-bold text-red-400">No seats selected for checkout</div>
              <div className="text-xs sm:text-sm text-slate-300 mt-1">Please return to the event page, select your preferred seats, and click &quot;Hold Seats&quot; before paying.</div>
            </div>
            <button
              onClick={() => eventId ? router.push(`/events/${eventId}`) : router.push("/")}
              className="px-4 py-2.5 text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all shrink-0"
            >
              Select Seats
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

          {/* ORDER SUMMARY */}
          <div className="lg:col-span-5 glass rounded-2xl p-6 sm:p-8 border border-white/10">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-6">Order Summary</h2>

            {event && (
              <div className="pb-5 mb-5 border-b border-white/10">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5">{event.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1">
                  <span>📍</span> {event.venue?.name}
                </p>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center gap-1">
                  <span>📅</span> {new Date(event.date).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}
                </p>
              </div>
            )}

            {seats.length > 0 ? (
              <div className="space-y-3 mb-6">
                {seats.map((seat: any) => (
                  <div key={seat.id} className="flex justify-between items-center text-sm sm:text-base">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">Seat {seat.label}</span>
                      <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">{seat.category}</span>
                    </div>
                    <span className="font-bold text-violet-400">₹{seat.price}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 italic mb-6">
                No seats held yet.
              </div>
            )}

            <div className="pt-5 border-t border-white/10 flex justify-between items-center">
              <span className="text-base sm:text-lg font-bold text-white">Total Payable</span>
              <span className={`text-2xl sm:text-3xl font-black ${total > 0 ? "text-emerald-400" : "text-slate-500"}`}>₹{total}</span>
            </div>

            <div className="mt-6 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 flex items-center gap-3 text-xs sm:text-sm text-emerald-300">
              <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>Seats held for 10 minutes. Instant QR ticket confirmation.</span>
            </div>
          </div>

          {/* PAYMENT SECTION */}
          <div className="lg:col-span-7 glass rounded-2xl p-6 sm:p-8 border border-white/10">
            <div className="flex items-center gap-2.5 mb-6">
              <Lock className="w-5 h-5 text-violet-400" />
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">Select Payment Method</h2>
            </div>

            {error && (
              <div className="bg-red-950/40 border border-red-500/30 text-red-300 p-4 rounded-xl mb-6 text-xs sm:text-sm">
                {error}
              </div>
            )}

            {/* Payment Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
              {[
                { id: "UPI", label: "UPI", icon: QrCode },
                { id: "CARD", label: "Card", icon: CreditCard },
                { id: "NETBANKING", label: "Banking", icon: Building2 },
                { id: "WALLET", label: "Wallet", icon: Wallet },
              ].map(({ id, label, icon: Icon }) => {
                const active = paymentMethod === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentMethod(id as PaymentMethod)}
                    className={`
                      flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all text-xs sm:text-sm font-bold
                      ${active
                        ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/40 scale-[1.02]"
                        : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5"
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-5">
              {/* UPI Option */}
              {paymentMethod === "UPI" && (
                <div className="space-y-3">
                  <label className="text-xs sm:text-sm font-semibold text-slate-300">UPI ID (GPay / PhonePe / Paytm)</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. mobileNumber@upi"
                    className="w-full px-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 text-sm"
                    required
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    {["GPay", "PhonePe", "Paytm", "BHIM"].map((app) => (
                      <span key={app} className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-violet-300">
                        ✓ {app}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Card Option */}
              {paymentMethod === "CARD" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs sm:text-sm font-semibold text-slate-300 block mb-1.5">Name on Card</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-semibold text-slate-300 block mb-1.5">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4532 8901 2345 6789"
                      className="w-full px-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 text-sm"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-slate-300 block mb-1.5">Expiry</label>
                      <input
                        type="text"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full px-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-slate-300 block mb-1.5">CVV</label>
                      <input
                        type="password"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        placeholder="123"
                        maxLength={4}
                        className="w-full px-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* NetBanking Option */}
              {paymentMethod === "NETBANKING" && (
                <div className="space-y-3">
                  <label className="text-xs sm:text-sm font-semibold text-slate-300">Select Bank</label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 text-sm"
                  >
                    <option value="HDFC Bank">HDFC Bank</option>
                    <option value="State Bank of India">State Bank of India (SBI)</option>
                    <option value="ICICI Bank">ICICI Bank</option>
                    <option value="Axis Bank">Axis Bank</option>
                    <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                  </select>
                </div>
              )}

              {/* Wallet Option */}
              {paymentMethod === "WALLET" && (
                <div className="space-y-3">
                  <label className="text-xs sm:text-sm font-semibold text-slate-300">Select Digital Wallet</label>
                  <select
                    value={selectedWallet}
                    onChange={(e) => setSelectedWallet(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 text-sm"
                  >
                    <option value="Paytm Wallet">Paytm Wallet</option>
                    <option value="Amazon Pay">Amazon Pay</option>
                    <option value="Mobikwik">Mobikwik</option>
                    <option value="Freecharge">Freecharge</option>
                  </select>
                </div>
              )}

              <button
                id="confirm-payment-btn"
                type="submit"
                disabled={isBooking || hasNoSeats}
                className={`
                  w-full mt-4 py-4 px-6 rounded-xl font-extrabold text-base sm:text-lg transition-all flex items-center justify-center gap-2.5
                  ${hasNoSeats
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                    : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-xl shadow-violet-900/50 hover:scale-[1.01]"
                  }
                  ${isBooking ? "opacity-60 cursor-wait" : ""}
                `}
              >
                {isBooking ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing Payment...</>
                ) : hasNoSeats ? (
                  "Select Seats to Pay"
                ) : (
                  `Pay ₹${total} & Confirm Booking`
                )}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
