/**
 * Redis cache layer using Upstash REST API.
 *
 * Activates automatically when UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN env vars are set.
 * Falls through transparently when they're absent (no cost, no errors).
 *
 * Usage:
 *   const cached = await cache.get<Product[]>('products:all')
 *   await cache.set('products:all', data, 300) // TTL seconds
 *   await cache.del('products:all')
 *   await cache.delPattern('products:*')
 */

let redis: any = null

function getRedis() {
  if (redis) return redis
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  try {
    const { Redis } = require('@upstash/redis')
    redis = new Redis({ url, token })
  } catch {
    redis = null
  }
  return redis
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const r = getRedis()
    if (!r) return null
    try {
      return (await r.get(key)) as T | null
    } catch {
      return null
    }
  },

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    const r = getRedis()
    if (!r) return
    try {
      await r.set(key, value, { ex: ttlSeconds })
    } catch {}
  },

  async del(key: string): Promise<void> {
    const r = getRedis()
    if (!r) return
    try { await r.del(key) } catch {}
  },

  /** Delete all keys matching a pattern (uses SCAN — safe on free tier) */
  async delPattern(pattern: string): Promise<void> {
    const r = getRedis()
    if (!r) return
    try {
      let cursor = 0
      do {
        const [nextCursor, keys] = await r.scan(cursor, { match: pattern, count: 100 }) as [number, string[]]
        cursor = Number(nextCursor)
        if (keys.length > 0) await r.del(...keys)
      } while (cursor !== 0)
    } catch {}
  },

  /** Wrap a DB call with cache-first + background revalidation */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds = 300,
  ): Promise<T> {
    const cached = await cache.get<T>(key)
    if (cached !== null) return cached
    const fresh = await fn()
    cache.set(key, fresh, ttlSeconds).catch(() => {})
    return fresh
  },
}
