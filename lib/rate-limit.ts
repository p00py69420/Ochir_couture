import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let orderLimiter: Ratelimit | null = null;

export function getOrderLimiter() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  if (!orderLimiter) {
    orderLimiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      prefix: "ochir-couture:public-order",
      analytics: false,
    });
  }
  return orderLimiter;
}
