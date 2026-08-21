import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import Link from "next/link";

export default async function WaitlistClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const session = await auth();
  const { token } = await params;
  if (!session?.user?.id) redirect(`/auth/login?callbackUrl=/waitlist/claim/${token}`);

  const entry = await prisma.waitlist.findUnique({
    where: { offerToken: token },
    include: {
      user: true,
      event: { include: { venue: true } },
      offeredSeat: true,
    },
  });

  if (!entry) return notFound();

  // Ensure it belongs to this user
  if (entry.userId !== session.user.id) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center glass rounded-2xl p-10 border border-red-500/20 max-w-md">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white">Not Authorized</h2>
          <p className="text-slate-400 mt-2">This offer belongs to a different account.</p>
        </div>
      </div>
    );
  }

  // Check if offer has expired
  const isExpired = entry.status === "EXPIRED" ||
    (entry.offerExpiresAt && new Date(entry.offerExpiresAt) < new Date());

  if (isExpired || entry.status === "BOOKED") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center glass rounded-2xl p-10 border border-amber-500/20 max-w-md">
          <Clock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white">
            {entry.status === "BOOKED" ? "Already Booked" : "Offer Expired"}
          </h2>
          <p className="text-slate-400 mt-2">
            {entry.status === "BOOKED"
              ? "You've already booked this seat."
              : "This offer has expired. The seat may have been offered to the next person."}
          </p>
          <Link href="/" className="inline-block mt-6 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all">
            Browse Events
          </Link>
        </div>
      </div>
    );
  }

  // Valid offer — redirect to checkout with the specific seat
  if (entry.offeredSeat && entry.event) {
    redirect(
      `/events/${entry.eventId}/checkout?seats=${entry.offeredSeatId}&waitlistToken=${token}`
    );
  }

  return notFound();
}
