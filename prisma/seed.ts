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

  // Movies
  await createEvent({
    title: "Inception (Christopher Nolan)",
    description: "Cobb steals information from targets by entering their dreams. Experience Nolan's mind-bending masterpiece in IMAX.",
    type: "MOVIE",
    imageUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80",
    date: futureDate(3)
  }, venue1);

  await createEvent({
    title: "Interstellar Remastered 4K",
    description: "When Earth becomes uninhabitable, a team of ex-NASA pilots travel through a wormhole to find a new planet for humanity.",
    type: "MOVIE",
    imageUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80",
    date: futureDate(5, 20)
  }, venue1);

  await createEvent({
    title: "Oppenheimer (IMAX 70mm)",
    description: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
    type: "MOVIE",
    imageUrl: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=800&q=80",
    date: futureDate(8, 19)
  }, venue1);

  await createEvent({
    title: "Avatar: Fire and Ash (3D Laser IMAX)",
    description: "Return to Pandora in James Cameron's groundbreaking visual spectacle featuring high frame rate 3D laser projection.",
    type: "MOVIE",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
    date: futureDate(12, 21)
  }, venue1);

  await createEvent({
    title: "The Dark Knight Rises (Nolan Special)",
    description: "Eight years after the Joker's reign of anarchy, Batman is forced from his exile to save Gotham City from Bane.",
    type: "MOVIE",
    imageUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=800&q=80",
    date: futureDate(15, 18)
  }, venue1);

  await createEvent({
    title: "Dune Part 3 Premiere",
    description: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
    type: "MOVIE",
    imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
    date: futureDate(18, 20)
  }, venue1);

  // Concerts
  await createEvent({
    title: "Coldplay Music of the Spheres Tour",
    description: "Experience the world's most spectacular stadium concert with wristband lights, pyrotechnics, and iconic hits.",
    type: "CONCERT",
    imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
    date: futureDate(7, 19)
  }, venue2);

  await createEvent({
    title: "AR Rahman Live in Concert",
    description: "An unforgettable evening with the Oscar-winning maestro performing legendary melodies and symphonic arrangements live.",
    type: "CONCERT",
    imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
    date: futureDate(14, 19)
  }, venue2);

  await createEvent({
    title: "Ed Sheeran Mathematics Tour Live",
    description: "The global pop superstar brings his 360-degree round stage setup for a massive night of acoustic mastery and loop-pedal hits.",
    type: "CONCERT",
    imageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80",
    date: futureDate(21, 19)
  }, venue2);

  await createEvent({
    title: "Arijit Singh Soulful Nights Live",
    description: "India's favorite voice performs a 3-hour non-stop grand concert with a 50-piece live orchestra.",
    type: "CONCERT",
    imageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80",
    date: futureDate(25, 18)
  }, venue2);

  await createEvent({
    title: "Diljit Dosanjh Dil-Luminati Tour",
    description: "High-energy Punjabi beats, sensational vocals, and electrifying stage performance from the global sensation Diljit Dosanjh.",
    type: "CONCERT",
    imageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=800&q=80",
    date: futureDate(30, 20)
  }, venue2);

  console.log("\n✅ Seeding complete!");
  console.log("Demo accounts (password: demo1234):");
  console.log("  Admin:     admin@demo.com");
  console.log("  Organiser: org@demo.com");
  console.log("  Customer:  user@demo.com");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
