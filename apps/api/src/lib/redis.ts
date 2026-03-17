import Redis from 'ioredis'

export const CACHE_TTL = {
  ANIME: 60 * 60,        // 1 hour
  ANIME_LIST: 60 * 10,   // 10 minutes
  EPISODE: 60 * 60 * 6,  // 6 hours
}

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (process.env.REDIS_ENABLED !== 'true') return null
  if (redis) return redis
  try {
    const client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    })
    client.on('error', () => { /* suppress */ })
    redis = client
    return redis
  } catch {
    return null
  }
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const client = getRedis()
    if (!client) return null
    const val = await client.get(key)
    return val ? JSON.parse(val) : null
  } catch {
    return null
  }
}

export async function setCached(key: string, value: unknown, ttl: number): Promise<void> {
  try {
    const client = getRedis()
    if (!client) return
    await client.setex(key, ttl, JSON.stringify(value))
  } catch {
    // silently skip caching if Redis is unavailable
  }
}
