# 🎟️ TicketHub — Enterprise Ticket Booking System

> **Submission for:** Unthinkable Solutions  
> **Candidate:** Ravi Raj Choubey  
> **Stack:** Next.js 15 · PostgreSQL (Supabase) · Redis (Upstash) · NextAuth v5 · Brevo / Nodemailer / Resend · Tailwind CSS · Vercel

---

## 🚀 Live Demo

**Hosted Production URL:** `https://ticket-booking-system-2xqf.vercel.app`

**Demo Accounts (password: `demo1234`):**

| Role | Email | Password |
|---|---|---|
| Admin | `admin@demo.com` | `demo1234` |
| Organiser | `org@demo.com` | `demo1234` |
| Customer | `user@demo.com` | `demo1234` |

---

## 📋 Features

- ✅ **Role-based Auth** — Customer / Organiser / Admin with NextAuth v5 JWT strategy
- ✅ **Visual Seat Map** — Real-time color-coded seat grid per venue & show
- ✅ **Seat Hold TTL** — 10-minute seat hold via Upstash Redis atomic `SET NX EX` + PostgreSQL row lock
- ✅ **Auto-release** — Cron job releases abandoned/expired holds automatically
- ✅ **Concurrency Protection** — Dual-layer safety: Redis NX + Postgres `SELECT FOR UPDATE` transaction row locks
- ✅ **Universal Email Engine** — Direct QR code ticket delivery via Nodemailer SMTP (Brevo / Gmail) & Resend
- ✅ **Waitlist System** — FIFO queue per seat category; auto-offers seat on booking cancellation
- ✅ **Time-limited Offers** — 15-minute time-limited claim token sent via email for waitlisted users
- ✅ **Booking Management** — View QR tickets, download ticket images, and process cancellations

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | PostgreSQL (Supabase Cloud) |
| ORM | Prisma ORM 5.22 |
| Auth | NextAuth.js v5 (JWT) |
| Seat Hold TTL | Upstash Redis |
| Email Engine | Nodemailer (Brevo SMTP / Gmail App Password) + Resend API |
| QR Code | `qrcode` npm (base64 + inline CID + HTTPS proxy rendering) |
| Deployment | Vercel |
| Styling | Tailwind CSS v4 |

---

## ⚙️ Local Setup

### 1. Clone & Install

```bash
git clone https://github.com/RaviRajChoubey/Ticket_Booking_System.git
cd ticket-booking-app
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
# PostgreSQL (Supabase Transaction Pooler on port 6543)
DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[pass]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# NextAuth v5
NEXTAUTH_SECRET="cd4fb3995b2ac2974e31ec94d9cc00e0bd67ce48df57a90f9ea29475752efac5"
NEXTAUTH_URL="http://localhost:3000"

# Upstash Redis (Seat Hold TTL)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Brevo SMTP (Universal Ticket Email Delivery to ANY Address)
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT="587"
SMTP_USER="your_brevo_smtp_login"
SMTP_PASS="xsmtpsib-your_brevo_smtp_key"

# Resend API (Optional secondary email provider)
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="onboarding@resend.dev"

# App Public URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Database Migration & Seeding

```bash
# Push schema migrations
npx prisma migrate deploy

# Seed demo users, venues, movies & concerts
npx prisma db seed
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
├── id, title, type (MOVIE|CONCERT), date, imageUrl, description
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
| POST | `/api/auth/register` | Register user account |
| POST | `/api/auth/[...nextauth]` | NextAuth sign in/out handlers |

### Events
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/events` | Public | List events (search, filter by type, paginate) |
| POST | `/api/events` | ORGANISER | Create event listing (auto-generates seat map) |
| GET | `/api/events/:eventId` | Public | Event detail + all seat statuses |

### Seats
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/seats/hold` | CUSTOMER | Hold seats (Redis atomic `SET NX` + DB timestamp) |
| POST | `/api/seats/release` | CUSTOMER | Release held seats |

### Bookings & Emails
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/bookings` | CUSTOMER | Create booking (transactional `SELECT FOR UPDATE`) |
| GET | `/api/bookings` | CUSTOMER | List my bookings |
| GET | `/api/bookings/:bookingRef` | Owner/ADMIN | Booking detail + QR Code ticket download |
| DELETE | `/api/bookings/:bookingRef` | Owner | Cancel booking & trigger waitlist offer cascade |
| GET | `/api/test-email` | Public | Live email diagnostic test route (`?to=user@email.com`) |

### Waitlist
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/waitlist` | CUSTOMER | Join category waitlist for sold-out event |
| GET | `/api/waitlist` | CUSTOMER | My waitlist queue entries |

### Cron Jobs (Vercel, Bearer protected)
| Method | Endpoint | Schedule | Description |
|---|---|---|---|
| GET | `/api/cron/release-expired-holds` | Daily / Scheduled | Auto-release expired seat holds |
| GET | `/api/cron/process-waitlist-offers` | Daily / Scheduled | Expire old offers & notify next in line |

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

A **Vercel Cron Job** (`/api/cron/release-expired-holds`) runs periodically to query for seats where `holdExpiresAt < NOW AND status = HELD`, updates them to `AVAILABLE`, deletes any lingering Redis keys, and triggers the waitlist for each freed seat category.

### 2. Concurrency Prevention

Two layers protect against simultaneous booking of the same seat:

**Layer 1 — Redis `SET NX` (atomic):** Redis is single-threaded. `SET NX` is guaranteed atomic — two requests that arrive at exactly the same millisecond will still be serialized. Only one will succeed. We use a pipeline to attempt all seat holds atomically. If any `SET NX` fails, we rollback all others in the same request.

**Layer 2 — Postgres `SELECT FOR UPDATE`:** During final booking confirmation (`POST /api/bookings`), we wrap the entire operation in a `prisma.$transaction()` with custom `{ maxWait: 10000, timeout: 15000 }` timeouts and use raw SQL `SELECT ... FOR UPDATE` to acquire exclusive row-level locks on the `Seat` rows. This prevents two simultaneous `POST /api/bookings` requests from both seeing `status = HELD` and creating duplicate bookings. Only one transaction will acquire the lock; the other blocks until the first commits, then sees the updated `status = BOOKED` and fails gracefully.

### 3. Universal Email Engine & QR Ticket Delivery

Email sending uses a dual-provider architecture in `src/lib/email.ts`:

1. **Nodemailer SMTP Driver (Primary):** Authenticates via TLS/STARTTLS over port 587 or 465 to services like Brevo (`smtp-relay.brevo.com`) or Gmail App Passwords. This bypasses sandbox domain restrictions and delivers ticket emails directly to **any registered user's email address**.
2. **Resend REST API Driver (Fallback):** Makes direct HTTPS REST API calls using `Authorization: Bearer <key>`.

QR Codes are generated as PNG buffers and attached via inline CIDs and rendered via secure HTTPS proxy URLs for guaranteed display across Gmail, Yahoo, Outlook, and Apple Mail.

### 4. Waitlist Auto-Assignment Flow & Offer Handling

The waitlist is a **per-event, per-category queue** with integer `position` values. When a seat becomes available (from cancellation, hold expiry, or admin action), `processWaitlistForCategory()` is executed:

1. Query: `SELECT first WAITING entry WHERE eventId AND category ORDER BY position ASC`
2. Query: `SELECT first AVAILABLE seat WHERE eventId AND category`
3. If both exist: generate a secure 32-byte random `offerToken`
4. Update `Waitlist: status = OFFERED, offeredSeatId, offerToken, offerExpiresAt = now + 15min`
5. Update `Seat: status = HELD, holdByUserId = waitlistEntry.userId, holdExpiresAt = offerExpiresAt`
6. Send email with link: `https://ticket-booking-system-2xqf.vercel.app/waitlist/claim/{token}` — expires in 15 minutes

The `/waitlist/claim/:token` page validates the token, checks that `offerExpiresAt > NOW`, and redirects to checkout with the specific seat pre-filled. If unclaimed after 15 minutes, the cron job marks the offer `EXPIRED` and offers the seat to the next person in line.

---

## 📦 Deliverables Checklist

- [x] Source code (this repository)
- [x] `.env.example` with all environment variable names
- [x] `README.md` with setup guide + API docs + DB schema + live production URL
- [x] Hosted URL on Vercel (`https://ticket-booking-system-2xqf.vercel.app`)
- [x] System design write-up (~800 words)
