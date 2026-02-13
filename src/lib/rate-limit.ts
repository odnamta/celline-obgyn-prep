/**
 * V20: In-memory sliding window rate limiter for server actions.
 *
 * Tracks request timestamps per key (user ID) and rejects
 * when the limit is exceeded within the window.
 *
 * Note: This is per-process. In a multi-instance deployment,
 * replace with Redis-based rate limiting.
 */

type RateLimitEntry = {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  const cutoff = now - windowMs * 2
  for (const [key, entry] of store) {
    if (entry.timestamps.length === 0 || entry.timestamps[entry.timestamps.length - 1] < cutoff) {
      store.delete(key)
    }
  }
}

export type RateLimitConfig = {
  /** Maximum number of requests allowed within the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetMs: number
}

/**
 * Check and consume a rate limit token for the given key.
 * Returns whether the request is allowed and remaining quota.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  cleanup(config.windowMs)

  const now = Date.now()
  const windowStart = now - config.windowMs

  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart)

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0]
    return {
      allowed: false,
      remaining: 0,
      resetMs: oldestInWindow + config.windowMs - now,
    }
  }

  entry.timestamps.push(now)
  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
    resetMs: config.windowMs,
  }
}

// Pre-configured rate limit profiles
export const RATE_LIMITS = {
  /** General API actions: 60 requests per minute */
  standard: { maxRequests: 60, windowMs: 60_000 } as RateLimitConfig,
  /** Sensitive actions (session start, complete): 10 per minute */
  sensitive: { maxRequests: 10, windowMs: 60_000 } as RateLimitConfig,
  /** Bulk operations: 5 per minute */
  bulk: { maxRequests: 5, windowMs: 60_000 } as RateLimitConfig,
  /** Auth attempts: 10 per 5 minutes */
  auth: { maxRequests: 10, windowMs: 5 * 60_000 } as RateLimitConfig,
} as const
