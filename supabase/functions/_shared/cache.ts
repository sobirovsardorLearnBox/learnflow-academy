// In-memory cache for edge functions
// Note: This cache resets on cold starts but is effective for hot instances

interface CacheEntry<T> {
  data: T
  expiry: number
}

const store = new Map<string, CacheEntry<unknown>>()

// Default TTL values in milliseconds
export const CACHE_TTL = {
  short: 10000,      // 10 seconds
  medium: 30000,     // 30 seconds  
  long: 60000,       // 1 minute
  extended: 300000   // 5 minutes
} as const

export function get<T>(key: string): T | null {
  const entry = store.get(key)
  
  if (!entry) return null
  
  if (Date.now() > entry.expiry) {
    store.delete(key)
    return null
  }
  
  return entry.data as T
}

export function set<T>(key: string, data: T, ttlMs: number = CACHE_TTL.medium): void {
  store.set(key, {
    data,
    expiry: Date.now() + ttlMs
  })
}

export function del(key: string): boolean {
  return store.delete(key)
}

export function invalidatePattern(pattern: string): number {
  let count = 0
  for (const key of store.keys()) {
    if (key.includes(pattern)) {
      store.delete(key)
      count++
    }
  }
  return count
}

export function clear(): void {
  store.clear()
}

export function size(): number {
  return store.size
}

// Cleanup expired entries
export function cleanup(): number {
  const now = Date.now()
  let count = 0
  
  for (const [key, value] of store) {
    if (now > value.expiry) {
      store.delete(key)
      count++
    }
  }
  
  return count
}

// Cache wrapper for async functions
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = CACHE_TTL.medium
): Promise<{ data: T; cached: boolean }> {
  const existing = get<T>(key)
  
  if (existing !== null) {
    return { data: existing, cached: true }
  }
  
  const data = await fn()
  set(key, data, ttlMs)
  
  return { data, cached: false }
}
