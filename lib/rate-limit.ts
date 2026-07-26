import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type LimitKind = "signup" | "events";

type RateLimitResult = {
  success: boolean;
  remaining: number;
  reset: number;
  configured: boolean;
  available: boolean;
};

let signupLimiter: Ratelimit | null = null;
let eventLimiter: Ratelimit | null = null;

function hasRedisConfiguration() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

function getLimiter(kind: LimitKind) {
  if (!hasRedisConfiguration()) return null;
  if (kind === "signup" && signupLimiter) return signupLimiter;
  if (kind === "events" && eventLimiter) return eventLimiter;

  const redis = Redis.fromEnv();
  const limiter = new Ratelimit({
    redis,
    limiter:
      kind === "signup"
        ? Ratelimit.slidingWindow(8, "10 m")
        : Ratelimit.slidingWindow(60, "1 m"),
    prefix: `launchbeam:${kind}`,
    analytics: false,
    // The SDK marks its bounded timeout as an allowed result. We explicitly
    // turn that result into an unavailable/fail-closed response below.
    timeout: 1_500,
  });
  if (kind === "signup") signupLimiter = limiter;
  else eventLimiter = limiter;
  return limiter;
}

export function hashRateLimitIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function checkRateLimit(
  kind: LimitKind,
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = getLimiter(kind);
  if (!limiter) {
    const allowed = process.env.NODE_ENV !== "production";
    return {
      success: allowed,
      remaining: allowed ? 1 : 0,
      reset: Date.now() + 60_000,
      configured: false,
      available: allowed,
    };
  }

  try {
    const result = await limiter.limit(hashRateLimitIdentifier(identifier));
    if (result.reason === "timeout") {
      return {
        success: false,
        remaining: 0,
        reset: Date.now() + 60_000,
        configured: true,
        available: false,
      };
    }
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
      configured: true,
      available: true,
    };
  } catch {
    return {
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
      configured: true,
      available: false,
    };
  }
}
