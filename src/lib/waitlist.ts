import { prisma } from "@/lib/prisma";
import { getResend, FROM_EMAIL, APP_NAME } from "@/lib/resend";
import { WAITLIST_OFFER_TTL_SECONDS } from "@/lib/redis";
import crypto from "crypto";

/**
 * Find the next available seat in a category and offer it to the first person
 * in the waitlist queue for that event/category.
 */
export async function processWaitlistForCategory(eventId: string, category: string) {
  try {
    // Find first WAITING entry in queue for this category
    const waitlistEntry = await prisma.waitlist.findFirst({
      where: { eventId, category, status: "WAITING" },
      orderBy: { position: "asc" },
      include: { user: true, event: true },
    });

    if (!waitlistEntry) return; // No one waiting

    // Find an available seat in this category
    const availableSeat = await prisma.seat.findFirst({
      where: { eventId, category, status: "AVAILABLE" },
    });

    if (!availableSeat) return; // No available seat yet

    // Generate a secure offer token
    const offerToken = crypto.randomBytes(32).toString("hex");
    const offerExpiresAt = new Date(Date.now() + WAITLIST_OFFER_TTL_SECONDS * 1000);

    // Update waitlist entry with offer
    await prisma.waitlist.update({
      where: { id: waitlistEntry.id },
      data: {
        status: "OFFERED",
        offeredSeatId: availableSeat.id,
        offerToken,
        offerExpiresAt,
      },
    });

    // Temporarily hold the seat for this person
    await prisma.seat.update({
      where: { id: availableSeat.id },
      data: {
        status: "HELD",
        holdByUserId: waitlistEntry.userId,
        holdExpiresAt: offerExpiresAt,
      },
    });

    // Send email with time-limited booking link
    const bookingLink = `${process.env.NEXT_PUBLIC_APP_URL}/waitlist/claim/${offerToken}`;
    const minutesLeft = Math.round(WAITLIST_OFFER_TTL_SECONDS / 60);

    await getResend().emails.send({
      from: FROM_EMAIL,
      to: waitlistEntry.user.email,
      subject: `🎟️ A seat is available! Book now — ${minutesLeft} minutes left`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #7c3aed;">Great news, ${waitlistEntry.user.name}!</h1>
          <p>A <strong>${category}</strong> seat has become available for:</p>
          <h2>${waitlistEntry.event.title}</h2>
          <p>Seat: <strong>${availableSeat.label}</strong></p>
          <p>Price: <strong>₹${availableSeat.price}</strong></p>
          <br />
          <p>⏰ This offer expires in <strong>${minutesLeft} minutes</strong>.</p>
          <a href="${bookingLink}" 
             style="background: #7c3aed; color: white; padding: 14px 28px; 
                    border-radius: 8px; text-decoration: none; font-size: 16px; display: inline-block;">
            Book Your Seat Now
          </a>
          <br /><br />
          <p style="color: #6b7280; font-size: 14px;">
            If you don't book within ${minutesLeft} minutes, this seat will be offered to the next person in line.
          </p>
          <p style="color: #6b7280; font-size: 12px;">— ${APP_NAME} Team</p>
        </div>
      `,
    });

    console.log(`[WAITLIST] Offered seat ${availableSeat.label} to ${waitlistEntry.user.email}`);
  } catch (error) {
    console.error("[WAITLIST_PROCESS]", error);
  }
}
