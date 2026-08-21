import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo users
  const adminPassword = await bcrypt.hash("demo1234", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: { name: "Admin User", email: "admin@demo.com", hashedPassword: adminPassword, role: "ADMIN" },
  });

  const organiser = await prisma.user.upsert({
    where: { email: "org@demo.com" },
    update: {},
    create: { name: "Event Organiser", email: "org@demo.com", hashedPassword: adminPassword, role: "ORGANISER" },
  });

  await prisma.user.upsert({
    where: { email: "user@demo.com" },
    update: {},
    create: { name: "Demo Customer", email: "user@demo.com", hashedPassword: adminPassword, role: "CUSTOMER" },
  });

  // Create venues
  const venue1 = await prisma.venue.upsert({
    where: { id: "venue-imax-mumbai" },
    update: {},
    create: {
      id: "venue-imax-mumbai",
      name: "IMAX Mumbai",
      address: "Pheonix Palladium, Lower Parel, Mumbai 400013",
      totalRows: 10,
      totalCols: 15,
      categories: [
        { name: "Premium", rows: [1, 2, 3], price: 500 },
        { name: "Standard", rows: [4, 5, 6, 7, 8, 9, 10], price: 250 },
      ],
    },
  });

  const venue2 = await prisma.venue.upsert({
    where: { id: "venue-arena-delhi" },
    update: {},
    create: {
      id: "venue-arena-delhi",
      name: "Jawaharlal Nehru Stadium",
      address: "Lodhi Road, New Delhi 110003",
      totalRows: 12,
      totalCols: 20,
      categories: [
        { name: "VIP", rows: [1, 2], price: 2000 },
        { name: "Premium", rows: [3, 4, 5, 6], price: 1000 },
        { name: "Standard", rows: [7, 8, 9, 10, 11, 12], price: 500 },
      ],
    },
  });

  // Create events
  const rowLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  async function createEvent(data: any, venue: any) {
    const existing = await prisma.event.findFirst({ where: { title: data.title } });
    if (existing) { console.log(`  ↳ Skipped: ${data.title}`); return existing; }

    const cats = venue.categories as Array<{ name: string; rows: number[]; price: number }>;
    const event = await prisma.event.create({
      data: {
        ...data,
        venueId: venue.id,
        organiserId: organiser.id,
        status: "PUBLISHED",
      },
    });

    const seats = [];
    for (let row = 0; row < venue.totalRows; row++) {
      const rowLetter = rowLabels[row] || `R${row + 1}`;
      const cat = cats.find((c) => c.rows.includes(row + 1));
      for (let col = 1; col <= venue.totalCols; col++) {
        seats.push({
          eventId: event.id,
          row: row + 1,
          col,
          label: `${rowLetter}${col}`,
          category: cat?.name || "Standard",
          price: cat?.price || 250,
          status: "AVAILABLE" as const,
        });
      }
    }
    await prisma.seat.createMany({ data: seats });
    console.log(`  ✓ Created: ${data.title} with ${seats.length} seats`);
    return event;
  }

  const futureDate = (daysFromNow: number, hour = 18) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  await createEvent({ title: "Inception (Christopher Nolan)", type: "MOVIE", date: futureDate(3) }, venue1);
  await createEvent({ title: "Interstellar Remastered 4K", type: "MOVIE", date: futureDate(5, 20) }, venue1);
  await createEvent({ title: "Coldplay Music of the Spheres Tour", type: "CONCERT", date: futureDate(7) }, venue2);
  await createEvent({ title: "AR Rahman Live in Concert", type: "CONCERT", date: futureDate(14, 19) }, venue2);
  await createEvent({ title: "Dune Part 3 Premiere", type: "MOVIE", date: futureDate(10, 21) }, venue1);

  console.log("\n✅ Seeding complete!");
  console.log("Demo accounts (password: demo1234):");
  console.log("  Admin:     admin@demo.com");
  console.log("  Organiser: org@demo.com");
  console.log("  Customer:  user@demo.com");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
