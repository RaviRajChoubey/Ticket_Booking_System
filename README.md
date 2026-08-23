# 🎟️ TicketHub — Enterprise Ticket Booking System

> **Submission for:** Unthinkable Solutions  
> **Candidate:** [Your Name]  
> **Stack:** Next.js 14 · PostgreSQL · Redis · NextAuth · Resend · Vercel

---

## 🚀 Live Demo

**Hosted URL:** `https://ticket-booking-system-2xqf.vercel.app`

**Demo Accounts (password: `demo1234`):**

| Role | Email |
|---|---|
| Admin | admin@demo.com |
| Organiser | org@demo.com |
| Customer | user@demo.com |

---

## 📋 Features

- ✅ **Role-based Auth** — Customer / Organiser / Admin with JWT
- ✅ **Visual Seat Map** — Real-time color-coded seat grid
- ✅ **Seat Hold TTL** — 10-minute hold via Redis atomic `SET NX EX`
- ✅ **Auto-release** — Cron job releases expired holds every minute
- ✅ **Concurrency-safe Booking** — Redis NX + Postgres `SELECT FOR UPDATE`
- ✅ **QR Code Ticket** — Generated on booking, emailed via Resend
- ✅ **Waitlist** — Join queue per category; auto-offer on cancellation
- ✅ **Time-limited Offers** — 15-min email link for waitlisted users
- ✅ **Booking Cancellation** — Triggers waitlist cascade

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma |
| Auth | NextAuth.js v5 (JWT) |
| Seat Hold TTL | Upstash Redis |
| Email + QR | Resend + `qrcode` npm |
| Deployment | Vercel |
| Styling | Tailwind CSS |

---

## ⚙️ Local Setup

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd ticket-booking-app
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
# PostgreSQL (get from supabase.com → Project Settings → Database)
DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[password]@[host]:5432/postgres"

# NextAuth (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="your-random-secret"
NEXTAUTH_URL="http://localhost:3000"

# Upstash Redis (get from console.upstash.com)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Resend (get from resend.com/api-keys)
RESEND_API_KEY="re_..."

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Cron secret (any random string)
CRON_SECRET="your-cron-secret"
```

### 3. Set Up Database

```bash
# Run migrations
npx prisma migrate dev --name init

# Seed demo data
npm run db:seed
```

### 4. Start Dev Server

```bash
npm run dev
```

Open `http://localhost:3000`

---

## 🗄️ Database Schema

```
User
├── id, name, email, hashedPassword
└── role: CUSTOMER | ORGANISER | ADMIN

Venue
├── id, name, address, totalRows, totalCols
└── categories: JSON [{ name, rows[], price }]

Event
├── id, title, type (MOVIE|CONCERT), date
├── venueId → Venue
├── organiserId → User
└── status: DRAFT | PUBLISHED | SOLD_OUT | CANCELLED | COMPLETED

Seat
├── id, eventId → Event, row, col, label, category, price
├── status: AVAILABLE | HELD | BOOKED
├── holdByUserId, holdExpiresAt
└── Unique: (eventId, row, col)

Booking
├── id, userId → User, eventId → Event
├── bookingRef (unique), status (CONFIRMED|CANCELLED)
├── totalAmount, qrCodeData
└── seats → BookingSeat[]

Waitlist
├── id, userId → User, eventId → Event, category
├── status: WAITING | OFFERED | BOOKED | EXPIRED
├── offeredSeatId, offerExpiresAt, offerToken (unique)
└── position (queue order)
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/[...nextauth]` | NextAuth sign in/out |

### Events
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/events` | Public | List events (search, filter, paginate) |
| POST | `/api/events` | ORGANISER | Create event (auto-generates seat map) |
| GET | `/api/events/:eventId` | Public | Event detail + all seats |

### Seats
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/seats/hold` | CUSTOMER | Hold seats (Redis atomic NX + DB) |
| POST | `/api/seats/release` | CUSTOMER | Release held seats |

### Bookings
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/bookings` | CUSTOMER | Create booking (transactional) |
| GET | `/api/bookings` | CUSTOMER | List my bookings |
| GET | `/api/bookings/:bookingRef` | Owner/ADMIN | Booking detail |
| DELETE | `/api/bookings/:bookingRef` | Owner | Cancel booking |

### Waitlist
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/waitlist` | CUSTOMER | Join waitlist |
| GET | `/api/waitlist` | CUSTOMER | My waitlist entries |

### Venues (Admin)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/venues` | ADMIN | Create venue with seat categories |
| GET | `/api/venues` | Public | List venues |

### Cron Jobs (Vercel, Bearer protected)
| Method | Endpoint | Schedule | Description |
|---|---|---|---|
| GET | `/api/cron/release-expired-holds` | Every 1 min | Release expired seat holds |
| GET | `/api/cron/process-waitlist-offers` | Every 1 min | Expire old offers, offer to next |

---

## 🏗️ System Design (800 Words)

### 1. Seat Hold & TTL Mechanism

When a customer selects seats, the system places an atomic hold using **Upstash Redis** with a 10-minute TTL. The critical command is:

```
SET seat:hold:{eventId}:{seatId} {userId} NX EX 600
```

- `NX` (Not eXists): Only succeeds if no key exists — this is the core of our **optimistic lock**. If another user already holds the seat, the SET returns `null` and we immediately know the seat is taken.
- `EX 600`: The key auto-expires after 600 seconds (10 minutes). Redis handles this natively without any polling.

After a successful Redis hold, we update the PostgreSQL `Seat` row: `status = HELD`, `holdByUserId`, `holdExpiresAt = now + 10 min`. This DB record serves as the source of truth for the visual seat map.

A **Vercel Cron Job** (`/api/cron/release-expired-holds`) runs every minute. It queries for seats where `holdExpiresAt < NOW AND status = HELD`, updates them to `AVAILABLE`, deletes any lingering Redis keys, and triggers the waitlist for each freed seat category.

### 2. Concurrency Prevention

Two layers protect against simultaneous booking of the same seat:

**Layer 1 — Redis `SET NX` (atomic):** Redis is single-threaded. `SET NX` is guaranteed atomic — two requests that arrive at exactly the same millisecond will still be serialized. Only one will succeed. We use a pipeline to attempt all seat holds atomically. If any `SET NX` fails, we rollback all others in the same request.

**Layer 2 — Postgres `SELECT FOR UPDATE`:** During final booking confirmation (`POST /api/bookings`), we wrap the entire operation in a `prisma.$transaction()` and use raw SQL `SELECT ... FOR UPDATE` to acquire exclusive row-level locks on the `Seat` rows. This prevents two simultaneous `POST /api/bookings` requests (e.g. network retry) from both seeing `status = HELD` and both creating bookings. Only one transaction will acquire the lock; the other blocks until the first commits, then sees the updated `status = BOOKED` and fails gracefully.

**Idempotency:** We also check that `seat.holdByUserId === session.user.id` inside the transaction, preventing a race where user A's hold expires, user B holds the seat, and user A's delayed request tries to book it.

### 3. Waitlist Auto-Assignment Flow

The waitlist is a **per-event, per-category queue** with integer `position` values. When a seat becomes available (from cancellation, hold expiry, or admin action), `processWaitlistForCategory()` is called:

1. Query: `SELECT first WAITING entry WHERE eventId AND category ORDER BY position ASC`
2. Query: `SELECT first AVAILABLE seat WHERE eventId AND category`
3. If both exist: generate a secure 32-byte random `offerToken`
4. Update `Waitlist: status = OFFERED, offeredSeatId, offerToken, offerExpiresAt = now + 15min`
5. Update `Seat: status = HELD, holdByUserId = waitlistEntry.userId, holdExpiresAt = offerExpiresAt`
6. Send email with link: `https://app.com/waitlist/claim/{token}` — expires in 15 minutes

This approach ensures the seat is **atomically reserved** for the waitlisted user for 15 minutes. No one else can book it during this window.

### 4. Time-Limited Offer Handling

The `/waitlist/claim/:token` page validates:
1. Token exists in DB (`offerToken` field is unique-indexed)
2. `offerExpiresAt > NOW` (not expired)
3. `status === OFFERED` (not already booked or expired)
4. `userId === session.user.id` (belongs to this user)

If valid, it redirects to checkout with the specific `seatId` pre-filled. If the user completes booking, `Waitlist.status = BOOKED`.

The **second cron job** (`/api/cron/process-waitlist-offers`) runs every minute. It finds `Waitlist` entries where `status = OFFERED AND offerExpiresAt < NOW`, marks them `EXPIRED`, releases the held seat back to `AVAILABLE`, and calls `processWaitlistForCategory()` again — offering to the **next person in line**.

This creates a resilient FIFO queue with guaranteed time-limited offers, automatic fallback, and no manual intervention required.

---

## 🚀 Deploying to Vercel

### 1. Push to GitHub
```bash
git add . && git commit -m "Enterprise ticket booking system"
gh repo create ticket-booking-app --public --push
```

### 2. Deploy
1. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import your GitHub repo
2. Add all environment variables from `.env.example` in the Vercel dashboard
3. Set **Framework Preset** to Next.js
4. Click **Deploy**

### 3. Run Migrations on Production
```bash
npx prisma migrate deploy
npm run db:seed
```

Or set `DIRECT_URL` in Vercel and run via Vercel CLI:
```bash
vercel env pull
npx prisma migrate deploy
```

---

## 📦 Deliverables

- [x] Source code (this repository)
- [x] `.env.example` with all variable names
- [x] `README.md` with setup guide + API docs + DB schema
- [x] Hosted URL on Vercel
- [x] System design write-up (above, ~800 words)
