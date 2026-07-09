import { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ─── Store selection ───────────────────────────────────────────────────────
// Production (Vercel) is serverless/multi-instance, so counters must live in
// a shared store (Upstash Redis). If UPSTASH_* env vars aren't set (e.g. in
// local dev), fall back to an in-memory sliding window — correct only for a
// single process, which is fine for local development.

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const limiterCache = new Map<string, Ratelimit>();

function getUpstashLimiter(name: string, limit: number, windowSeconds: number): Ratelimit {
  const cacheKey = `${name}:${limit}:${windowSeconds}`;
  let limiter = limiterCache.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: `ratelimit:${name}`,
      analytics: false,
    });
    limiterCache.set(cacheKey, limiter);
  }
  return limiter;
}

// In-memory fallback: Map<bucketKey, timestamps[]>
const memoryBuckets = new Map<string, number[]>();

function checkMemoryLimit(bucketKey: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const timestamps = (memoryBuckets.get(bucketKey) || []).filter((t) => now - t < windowMs);

  const success = timestamps.length < limit;
  if (success) timestamps.push(now);
  memoryBuckets.set(bucketKey, timestamps);

  const oldest = timestamps[0] ?? now;
  return {
    success,
    limit,
    remaining: Math.max(0, limit - timestamps.length),
    reset: oldest + windowMs,
  };
}

export type RateLimitOptions = {
  /** Logical bucket name, scopes the limiter separately per route family. */
  name: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

export function getClientKey(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  return ip;
}

export async function checkRateLimit(req: NextRequest, options: RateLimitOptions) {
  const clientKey = getClientKey(req);
  const bucketKey = `${options.name}:${clientKey}`;

  if (redis) {
    const limiter = getUpstashLimiter(options.name, options.limit, options.windowSeconds);
    const result = await limiter.limit(clientKey);
    return { success: result.success, limit: result.limit, remaining: result.remaining, reset: result.reset };
  }

  return checkMemoryLimit(bucketKey, options.limit, options.windowSeconds);
}
