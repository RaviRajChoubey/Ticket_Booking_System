import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { TrendingUp, Ticket, Users, Calendar, Plus } from "lucide-react";
import Link from "next/link";

export default async function OrganiserDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "ORGANISER" && session.user.role !== "ADMIN") redirect("/");

  const events = await prisma.event.findMany({
    where: { organiserId: session.user.id },
    include: {
      venue: true,
      bookings: { where: { status: "CONFIRMED" } },
      seats: true,
      _count: { select: { bookings: true } },
    },
    orderBy: { date: "desc" },
  });

  const totalRevenue = events.reduce(
    (sum, e) => sum + e.bookings.reduce((s, b) => s + b.totalAmount, 0),
    0
  );
  const totalBookings = events.reduce((sum, e) => sum + e.bookings.length, 0);

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white">Organiser Dashboard</h1>
          <p className="text-slate-400 mt-1">Welcome back, {session.user.name}</p>
        </div>
        <Link
          href="/organiser/events/new"
          id="create-event-btn"
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-900/30"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        {[
          { icon: TrendingUp, label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, color: "text-emerald-400 bg-emerald-950/30 border-emerald-500/20" },
          { icon: Ticket, label: "Total Bookings", value: totalBookings.toString(), color: "text-violet-400 bg-violet-950/30 border-violet-500/20" },
          { icon: Calendar, label: "Total Events", value: events.length.toString(), color: "text-blue-400 bg-blue-950/30 border-blue-500/20" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className={`glass rounded-2xl p-6 border ${color.split(" ").slice(1).join(" ")}`}>
            <div className="flex items-center gap-3 mb-3">
              <Icon className={`w-5 h-5 ${color.split(" ")[0]}`} />
              <span className="text-sm text-slate-400">{label}</span>
            </div>
            <div className={`text-3xl font-extrabold ${color.split(" ")[0]}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Events table */}
      <div className="glass rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="font-bold text-white">Your Events</h2>
        </div>
        {events.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No events yet. Create your first event!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  {["Event", "Date", "Venue", "Booked / Total", "Revenue", "Status"].map((h) => (
                    <th key={h} className="px-6 py-3 text-xs text-slate-500 font-medium uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {events.map((event) => {
                  const booked = event.seats.filter((s) => s.status === "BOOKED").length;
                  const revenue = event.bookings.reduce((s, b) => s + b.totalAmount, 0);
                  return (
                    <tr key={event.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/events/${event.id}`} className="font-medium text-white hover:text-violet-300 transition-colors">
                          {event.title}
                        </Link>
                        <div className="text-xs text-slate-500 mt-0.5">{event.type}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {format(new Date(event.date), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">{event.venue.name}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">{booked} / {event.seats.length}</div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-violet-500 rounded-full"
                            style={{ width: `${event.seats.length > 0 ? (booked / event.seats.length) * 100 : 0}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-emerald-400">₹{revenue.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                          ${event.status === "PUBLISHED" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20" :
                            event.status === "SOLD_OUT" ? "bg-red-950/40 text-red-400 border border-red-500/20" :
                            "bg-slate-800 text-slate-400 border border-white/10"
                          }`}>
                          {event.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
