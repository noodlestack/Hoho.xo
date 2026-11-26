import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec?: number;
  unavailable?: boolean;
}

export const RATE_LIMIT_POLICY = {
  /**
   * When Upstash KV is configured and throws/times out, never fall open to
   * per-instance memory on serverless runtimes. Reject with 503 + Retry-After.
   */
  kvFailureBehavior: "fail_closed_503" as const,
  retryAfterOnUnavailableSec: 5,
  kvTimeoutMs: 2_500,
  limits: {
    globalMsgMax: 20,
    globalMsgWindowMs: 600_000,
    handleHourlyMax: 200,
    handleHourlyWindowMs: 3_600_000,
    ipHandleMinMax: 6,
    ipHandleMinWindowMs: 60_000,
    ipHandleHourMax: 30,
    ipHandleHourWindowMs: 3_600_000,
    claimHourlyProdMax: 20,
    claimHourlyDevMax: 120,
    claimHourlyWindowMs: 3_600_000,
  },
} as const;

export function getGlobalMsgLimit(): number {
  const raw = Number(process.env.HOHO_GLOBAL_MSG_LIMIT);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 10_000) {
    return Math.floor(raw);
  }
  return RATE_LIMIT_POLICY.limits.globalMsgMax;
}

export function getHandleHourlyLimit(): number {
  const raw = Number(process.env.HOHO_HANDLE_HOURLY_LIMIT);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 50_000) {
    return Math.floor(raw);
  }
  return RATE_LIMIT_POLICY.limits.handleHourlyMax;
}

export function getRateLimitKvEnv(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
  if (url && token) {
    return { url: url.replace(/\/$/, ""), token };
  }
  return null;
}

interface GlobalRateLimitState {
  memoryBuckets: Map<string, number[]>;
  redisClientKey: string | null;
  redisClient: Redis | null;
  limiters: Map<string, Ratelimit>;
}

const globalForRl = globalThis as typeof globalThis & {
  __hohoRateLimitState?: GlobalRateLimitState;
};

function getRlState(): GlobalRateLimitState {
  if (!globalForRl.__hohoRateLimitState) {
    globalForRl.__hohoRateLimitState = {
      memoryBuckets: new Map<string, number[]>(),
      redisClientKey: null,
      redisClient: null,
      limiters: new Map<string, Ratelimit>(),
    };
  }
  return globalForRl.__hohoRateLimitState;
}

export function resetRateLimitForTests(): void {
  const state = getRlState();
  state.memoryBuckets.clear();
  state.limiters.clear();
  state.redisClient = null;
  state.redisClientKey = null;
}

function getOrCreateLimiter(
  env: { url: string; token: string },
  maxHits: number,
  windowMs: number,
): Ratelimit {
  const state = getRlState();
  const clientKey = `${env.url}::${env.token}`;
  if (!state.redisClient || state.redisClientKey !== clientKey) {
    state.redisClient = new Redis({ url: env.url, token: env.token });
    state.redisClientKey = clientKey;
    state.limiters.clear();
  }

  const limiterKey = `${maxHits}:${windowMs}`;
  let limiter = state.limiters.get(limiterKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: state.redisClient,
      limiter: Ratelimit.slidingWindow(maxHits, `${windowMs} ms`),
      prefix: "hoho:rl",
      analytics: false,
    });
    state.limiters.set(limiterKey, limiter);
  }
  return limiter;
}

export async function checkRateLimit(
  bucketKey: string,
  maxHits: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const kv = getRateLimitKvEnv();
  if (kv) {
    try {
      const limiter = getOrCreateLimiter(kv, maxHits, windowMs);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Rate limiter KV timeout"));
        }, RATE_LIMIT_POLICY.kvTimeoutMs);
      });
      const res = await Promise.race([
        limiter.limit(bucketKey),
        timeoutPromise,
      ]);

      // Do not allow an unhandled rejection if background analytics/sync pending rejects
      void Promise.resolve(res.pending).catch(() => {});

      if (!res.success) {
        const retryAfterSec = Math.max(
          1,
          Math.ceil((res.reset - Date.now()) / 1000),
        );
        return { allowed: false, retryAfterSec };
      }
      return { allowed: true };
    } catch {
      return {
        allowed: false,
        unavailable: true,
        retryAfterSec: RATE_LIMIT_POLICY.retryAfterOnUnavailableSec,
      };
    }
  }

  const state = getRlState();
  const now = Date.now();
  const cutoff = now - windowMs;
  const existing = (state.memoryBuckets.get(bucketKey) ?? []).filter(
    (ts) => ts > cutoff,
  );
  if (existing.length >= maxHits) {
    const oldest = existing[0] ?? now;
    const retryAfterSec = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000),
    );
    state.memoryBuckets.set(bucketKey, existing);
    return { allowed: false, retryAfterSec };
  }
  existing.push(now);
  state.memoryBuckets.set(bucketKey, existing);
  return { allowed: true };
}
