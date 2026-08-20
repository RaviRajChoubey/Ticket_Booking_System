import { Redis } from "@upstash/redis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// Key helpers
export const seatHoldKey = (eventId: string, seatId: string) =>
  `seat:hold:${eventId}:${seatId}`;

export const SEAT_HOLD_TTL_SECONDS = 600; // 10 minutes
export const WAITLIST_OFFER_TTL_SECONDS = 900; // 15 minutes
