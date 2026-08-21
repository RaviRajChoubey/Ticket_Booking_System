import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Shield, Users, Building2, Plus } from "lucide-react";
import Link from "next/link";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const [userCount, venueCount, eventCount, bookingCount] = await Promise.all([
    prisma.user.count(),
    prisma.venue.count(),
    prisma.event.count(),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
  ]);

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const venues = await prisma.venue.findMany({
    include: { _count: { select: { events: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
            <p className="text-slate-400 text-sm">System management</p>
          </div>
        </div>
        <Link href="/admin/venues/new" id="create-venue-btn"
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all">
          <Plus className="w-4 h-4" /> Add Venue
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {[
          { label: "Total Users", value: userCount, color: "violet" },
          { label: "Venues", value: venueCount, color: "blue" },
          { label: "Events", value: eventCount, color: "amber" },
          { label: "Confirmed Bookings", value: bookingCount, color: "emerald" },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-2xl p-5 border border-white/10">
            <div className="text-3xl font-extrabold text-white">{value}</div>
            <div className="text-sm text-slate-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Users */}
        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" />
            <h2 className="font-bold text-white">Recent Users</h2>
          </div>
          <div className="divide-y divide-white/5">
            {recentUsers.map((user) => (
              <div key={user.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white text-sm">{user.name}</div>
                  <div className="text-xs text-slate-400">{user.email}</div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold
                  ${user.role === "ADMIN" ? "bg-violet-950/40 text-violet-400" :
                    user.role === "ORGANISER" ? "bg-blue-950/40 text-blue-400" :
                    "bg-slate-800 text-slate-400"}`}>
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Venues */}
        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-violet-400" />
            <h2 className="font-bold text-white">Venues</h2>
          </div>
          <div className="divide-y divide-white/5">
            {venues.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-500 text-sm">
                No venues yet. Add your first venue.
              </div>
            ) : venues.map((venue) => (
              <div key={venue.id} className="px-6 py-4">
                <div className="font-medium text-white">{venue.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{venue.address}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {venue.totalRows}×{venue.totalCols} seats · {venue._count.events} events
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
