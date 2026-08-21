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

  // Form states
  const [upiId, setUpiId] = useState("user@upi");
  const [cardName, setCardName] = useState("Ravi Raj Choubey");
  const [cardNumber, setCardNumber] = useState("4532 8901 2345 6789");
  const [expiry, setExpiry] = useState("12/28");
  const [cvv, setCvv] = useState("888");
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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#070b14", color: "#fff" }}>
        <Loader2 style={{ width: 40, height: 40, color: "#a78bfa" }} className="animate-spin" />
      </div>
    );
  }

  if (bookingRef) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#070b14", padding: 24 }}>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center", background: "#0f172a", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 24, padding: 40 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(52,211,153,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <CheckCircle2 style={{ width: 48, height: 48, color: "#34d399" }} />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: "0 0 12px" }}>Booking Confirmed! 🎉</h1>
          <p style={{ fontSize: 16, color: "#94a3b8", margin: "0 0 24px" }}>
            Your QR code ticket has been generated and confirmed.
          </p>
          <div style={{ background: "#1e293b", borderRadius: 16, padding: 20, marginBottom: 28, border: "1px solid rgba(52,211,153,0.2)" }}>
            <div style={{ fontSize: 13, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Booking Reference</div>
            <div style={{ fontFamily: "monospace", fontSize: 24, fontWeight: 800, color: "#a78bfa" }}>{bookingRef}</div>
          </div>
          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            <button
              onClick={() => router.push(`/bookings/${bookingRef}`)}
              style={{ padding: "14px 28px", fontSize: 16, fontWeight: 700, background: "#7c3aed", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer" }}
            >
              View Ticket & QR
            </button>
            <button
              onClick={() => router.push("/")}
              style={{ padding: "14px 24px", fontSize: 16, fontWeight: 600, background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, cursor: "pointer" }}
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
    <div style={{ minHeight: "100vh", background: "#070b14", color: "#fff", padding: "40px 60px 80px" }}>
      <button
        onClick={() => eventId ? router.push(`/events/${eventId}`) : router.push("/")}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 600, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", marginBottom: 32 }}
      >
        <ArrowLeft style={{ width: 18, height: 18 }} /> Back to seat map
      </button>

      {hasNoSeats && (
        <div style={{ maxWidth: 1100, margin: "0 auto 32px", padding: "18px 24px", borderRadius: 16, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", gap: 14 }}>
          <AlertCircle style={{ width: 24, height: 24, color: "#f87171", flexShrink: 0 }} />
          <div style={{ flexGrow: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#f87171" }}>No seats selected for checkout</div>
            <div style={{ fontSize: 14, color: "#cbd5e1", marginTop: 2 }}>Please return to the event page, select your preferred seats, and click &quot;Hold Seats&quot; before paying.</div>
          </div>
          <button
            onClick={() => eventId ? router.push(`/events/${eventId}`) : router.push("/")}
            style={{ padding: "10px 18px", fontSize: 14, fontWeight: 700, background: "#ef4444", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Select Seats
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 40, maxWidth: 1100, margin: "0 auto" }}>

        {/* ORDER SUMMARY */}
        <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 32, height: "fit-content" }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 24px" }}>Order Summary</h2>

          {event && (
            <div style={{ paddingBottom: 20, marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>{event.title}</h3>
              <p style={{ fontSize: 14, color: "#94a3b8", margin: 0 }}>📍 {event.venue?.name}</p>
              <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>📅 {new Date(event.date).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}</p>
            </div>
          )}

          {seats.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {seats.map((seat: any) => (
                <div key={seat.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 15 }}>
                  <div style={{ flexGrow: 1 }}>
                    <span style={{ color: "#fff", fontWeight: 700 }}>Seat {seat.label}</span>
                    <span style={{ color: "#64748b", marginLeft: 8, fontSize: 13, background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 6 }}>{seat.category}</span>
                  </div>
                  <span style={{ color: "#a78bfa", fontWeight: 700 }}>₹{seat.price}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 14, color: "#64748b", marginBottom: 24, fontStyle: "italic" }}>
              No seats held yet.
            </div>
          )}

          <div style={{ paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Total Payable</span>
            <span style={{ fontSize: 28, fontWeight: 900, color: total > 0 ? "#34d399" : "#64748b" }}>₹{total}</span>
          </div>

          <div style={{ marginTop: 24, padding: 14, borderRadius: 12, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#6ee7b7" }}>
            <ShieldCheck style={{ width: 20, height: 20, flexShrink: 0 }} />
            <span>Seats held for 10 minutes. Instant QR ticket confirmation.</span>
          </div>
        </div>

        {/* PAYMENT SECTION */}
        <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <Lock style={{ width: 22, height: 22, color: "#a78bfa" }} />
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: 0 }}>Select Payment Method</h2>
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", padding: "14px 18px", borderRadius: 12, marginBottom: 20, fontSize: 14 }}>
              {error}
            </div>
          )}

          {/* Payment Tabs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
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
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    padding: "12px 8px", borderRadius: 12, cursor: "pointer", border: "none",
                    background: active ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "rgba(255,255,255,0.05)",
                    color: active ? "#fff" : "#94a3b8", fontWeight: 700, fontSize: 13,
                    boxShadow: active ? "0 4px 16px rgba(124,58,237,0.4)" : "none"
                  }}
                >
                  <Icon style={{ width: 20, height: 20 }} />
                  {label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleConfirmPayment} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* UPI Option */}
            {paymentMethod === "UPI" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: "#cbd5e1" }}>UPI ID (GPay / PhonePe / Paytm)</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. mobileNumber@upi"
                  style={{ padding: "14px 18px", fontSize: 15, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#fff", outline: "none" }}
                  required
                />
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  {["GPay", "PhonePe", "Paytm", "BHIM"].map((app) => (
                    <span key={app} style={{ fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.06)", color: "#a78bfa" }}>
                      ✓ {app}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Card Option */}
            {paymentMethod === "CARD" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, color: "#cbd5e1", display: "block", marginBottom: 6 }}>Name on Card</label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    style={{ width: "100%", padding: "14px 18px", fontSize: 15, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#fff", outline: "none" }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, color: "#cbd5e1", display: "block", marginBottom: 6 }}>Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    style={{ width: "100%", padding: "14px 18px", fontSize: 15, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#fff", outline: "none" }}
                    required
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 14, fontWeight: 600, color: "#cbd5e1", display: "block", marginBottom: 6 }}>Expiry</label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      style={{ width: "100%", padding: "14px 18px", fontSize: 15, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#fff", outline: "none" }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 14, fontWeight: 600, color: "#cbd5e1", display: "block", marginBottom: 6 }}>CVV</label>
                    <input
                      type="password"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      style={{ width: "100%", padding: "14px 18px", fontSize: 15, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#fff", outline: "none" }}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* NetBanking Option */}
            {paymentMethod === "NETBANKING" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: "#cbd5e1" }}>Select Bank</label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  style={{ width: "100%", padding: "14px 18px", fontSize: 15, background: "#1e293b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#fff", outline: "none" }}
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
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: "#cbd5e1" }}>Select Digital Wallet</label>
                <select
                  value={selectedWallet}
                  onChange={(e) => setSelectedWallet(e.target.value)}
                  style={{ width: "100%", padding: "14px 18px", fontSize: 15, background: "#1e293b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#fff", outline: "none" }}
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
              style={{
                marginTop: 12, padding: "18px 24px", fontSize: 18, fontWeight: 800,
                color: "#fff", background: hasNoSeats ? "#334155" : "linear-gradient(135deg, #7c3aed, #4f46e5)",
                border: "none", borderRadius: 14, cursor: hasNoSeats ? "not-allowed" : "pointer",
                boxShadow: hasNoSeats ? "none" : "0 6px 24px rgba(124,58,237,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                opacity: isBooking || hasNoSeats ? 0.6 : 1
              }}
            >
              {isBooking ? (
                <><Loader2 style={{ width: 22, height: 22 }} className="animate-spin" /> Processing Payment...</>
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
  );
}
