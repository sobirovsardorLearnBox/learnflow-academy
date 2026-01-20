// Upstash Redis client for persistent caching and pub/sub
// Uses REST API for serverless compatibility

const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL') || ''
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || ''

interface RedisResponse<T = unknown> {
  result: T
  error?: string
}

// Low-level Redis command executor
async function execute<T = unknown>(command: string[]): Promise<T> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.warn('Redis not configured, falling back to in-memory cache')
    throw new Error('Redis not configured')
  }

  const response = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('Redis error:', text)
    throw new Error(`Redis error: ${response.status}`)
  }

  const data: RedisResponse<T> = await response.json()
  
  if (data.error) {
    throw new Error(data.error)
  }

  return data.result
}

// Pipeline for batch operations
async function pipeline(commands: string[][]): Promise<unknown[]> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error('Redis not configured')
  }

  const response = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  })

  if (!response.ok) {
    throw new Error(`Redis pipeline error: ${response.status}`)
  }

  const results = await response.json()
  return results.map((r: RedisResponse) => r.result)
}

// ============= CACHE OPERATIONS =============

export const CACHE_TTL = {
  short: 10,      // 10 seconds
  medium: 30,     // 30 seconds
  long: 60,       // 1 minute
  extended: 300,  // 5 minutes
  hour: 3600,     // 1 hour
  day: 86400,     // 1 day
} as const

export async function get<T>(key: string): Promise<T | null> {
  try {
    const result = await execute<string | null>(['GET', key])
    if (result === null) return null
    return JSON.parse(result) as T
  } catch (error) {
    console.error('Redis GET error:', error)
    return null
  }
}

export async function set<T>(key: string, value: T, ttlSeconds: number = CACHE_TTL.medium): Promise<boolean> {
  try {
    await execute(['SET', key, JSON.stringify(value), 'EX', String(ttlSeconds)])
    return true
  } catch (error) {
    console.error('Redis SET error:', error)
    return false
  }
}

export async function del(key: string): Promise<boolean> {
  try {
    await execute(['DEL', key])
    return true
  } catch (error) {
    console.error('Redis DEL error:', error)
    return false
  }
}

export async function exists(key: string): Promise<boolean> {
  try {
    const result = await execute<number>(['EXISTS', key])
    return result === 1
  } catch (error) {
    console.error('Redis EXISTS error:', error)
    return false
  }
}

export async function expire(key: string, ttlSeconds: number): Promise<boolean> {
  try {
    await execute(['EXPIRE', key, String(ttlSeconds)])
    return true
  } catch (error) {
    console.error('Redis EXPIRE error:', error)
    return false
  }
}

export async function ttl(key: string): Promise<number> {
  try {
    return await execute<number>(['TTL', key])
  } catch (error) {
    console.error('Redis TTL error:', error)
    return -1
  }
}

// Get multiple keys at once
export async function mget<T>(keys: string[]): Promise<(T | null)[]> {
  try {
    if (keys.length === 0) return []
    const results = await execute<(string | null)[]>(['MGET', ...keys])
    return results.map(r => r ? JSON.parse(r) as T : null)
  } catch (error) {
    console.error('Redis MGET error:', error)
    return keys.map(() => null)
  }
}

// Set multiple keys at once with pipeline
export async function mset(entries: { key: string; value: unknown; ttl?: number }[]): Promise<boolean> {
  try {
    if (entries.length === 0) return true
    
    const commands = entries.map(({ key, value, ttl: entryTtl }) => [
      'SET',
      key,
      JSON.stringify(value),
      'EX',
      String(entryTtl || CACHE_TTL.medium)
    ])
    
    await pipeline(commands)
    return true
  } catch (error) {
    console.error('Redis MSET error:', error)
    return false
  }
}

// Invalidate by pattern (using SCAN for safety)
export async function invalidatePattern(pattern: string): Promise<number> {
  try {
    let cursor = '0'
    let deleted = 0
    
    do {
      const [newCursor, keys] = await execute<[string, string[]]>(['SCAN', cursor, 'MATCH', pattern, 'COUNT', '100'])
      cursor = newCursor
      
      if (keys.length > 0) {
        await execute(['DEL', ...keys])
        deleted += keys.length
      }
    } while (cursor !== '0')
    
    return deleted
  } catch (error) {
    console.error('Redis SCAN/DEL error:', error)
    return 0
  }
}

// Atomic increment
export async function incr(key: string): Promise<number> {
  try {
    return await execute<number>(['INCR', key])
  } catch (error) {
    console.error('Redis INCR error:', error)
    return 0
  }
}

// Increment with TTL
export async function incrWithTTL(key: string, ttlSeconds: number): Promise<number> {
  try {
    const results = await pipeline([
      ['INCR', key],
      ['EXPIRE', key, String(ttlSeconds)]
    ])
    return results[0] as number
  } catch (error) {
    console.error('Redis INCR error:', error)
    return 0
  }
}

// ============= RATE LIMITING WITH REDIS =============

export async function checkRateLimit(
  identifier: string, 
  maxRequests: number, 
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  try {
    const key = `ratelimit:${identifier}`
    const now = Math.floor(Date.now() / 1000)
    const windowKey = `${key}:${Math.floor(now / windowSeconds)}`
    
    const count = await incrWithTTL(windowKey, windowSeconds)
    const remaining = Math.max(0, maxRequests - count)
    const resetIn = windowSeconds - (now % windowSeconds)
    
    return {
      allowed: count <= maxRequests,
      remaining,
      resetIn
    }
  } catch (error) {
    console.error('Rate limit check error:', error)
    // Allow request on Redis failure
    return { allowed: true, remaining: maxRequests, resetIn: 60 }
  }
}

// ============= PUB/SUB OPERATIONS =============

// Publish a message to a channel
export async function publish(channel: string, message: unknown): Promise<number> {
  try {
    const payload = typeof message === 'string' ? message : JSON.stringify(message)
    return await execute<number>(['PUBLISH', channel, payload])
  } catch (error) {
    console.error('Redis PUBLISH error:', error)
    return 0
  }
}

// Store notification for later retrieval (for polling-based clients)
export async function storeNotification(
  userId: string, 
  notification: {
    id: string
    type: string
    title: string
    message: string
    data?: Record<string, unknown>
    read?: boolean
    createdAt?: string
  }
): Promise<boolean> {
  try {
    const key = `notifications:${userId}`
    const notif = {
      ...notification,
      read: notification.read ?? false,
      createdAt: notification.createdAt ?? new Date().toISOString()
    }
    
    // Use LPUSH to add to list, LTRIM to keep last 50
    await pipeline([
      ['LPUSH', key, JSON.stringify(notif)],
      ['LTRIM', key, '0', '49'],
      ['EXPIRE', key, String(CACHE_TTL.day * 7)] // Keep for 7 days
    ])
    
    // Also publish for real-time listeners
    await publish(`user:${userId}:notifications`, notif)
    
    return true
  } catch (error) {
    console.error('Store notification error:', error)
    return false
  }
}

// Get notifications for a user
export async function getNotifications(userId: string, limit = 20): Promise<unknown[]> {
  try {
    const key = `notifications:${userId}`
    const results = await execute<string[]>(['LRANGE', key, '0', String(limit - 1)])
    return results.map(r => JSON.parse(r))
  } catch (error) {
    console.error('Get notifications error:', error)
    return []
  }
}

// Mark notification as read
export async function markNotificationRead(userId: string, notificationId: string): Promise<boolean> {
  try {
    const key = `notifications:${userId}`
    const notifications = await getNotifications(userId, 50)
    
    const updated = notifications.map((n: any) => {
      if (n.id === notificationId) {
        return { ...n, read: true }
      }
      return n
    })
    
    // Delete and recreate list
    await del(key)
    
    if (updated.length > 0) {
      const commands = updated.reverse().map(n => ['LPUSH', key, JSON.stringify(n)])
      await pipeline(commands)
      await expire(key, CACHE_TTL.day * 7)
    }
    
    return true
  } catch (error) {
    console.error('Mark notification read error:', error)
    return false
  }
}

// Clear all notifications for a user
export async function clearNotifications(userId: string): Promise<boolean> {
  try {
    await del(`notifications:${userId}`)
    return true
  } catch (error) {
    console.error('Clear notifications error:', error)
    return false
  }
}

// Get unread notification count
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const notifications = await getNotifications(userId, 50)
    return notifications.filter((n: any) => !n.read).length
  } catch (error) {
    console.error('Get unread count error:', error)
    return 0
  }
}

// ============= SESSION/PRESENCE =============

export async function setUserOnline(userId: string, metadata?: Record<string, unknown>): Promise<boolean> {
  try {
    const key = `presence:${userId}`
    const data = {
      online: true,
      lastSeen: new Date().toISOString(),
      ...metadata
    }
    await set(key, data, 120) // 2 minute TTL, needs heartbeat
    await execute(['SADD', 'online_users', userId])
    await expire('online_users', 300)
    return true
  } catch (error) {
    console.error('Set user online error:', error)
    return false
  }
}

export async function setUserOffline(userId: string): Promise<boolean> {
  try {
    await del(`presence:${userId}`)
    await execute(['SREM', 'online_users', userId])
    return true
  } catch (error) {
    console.error('Set user offline error:', error)
    return false
  }
}

export async function getOnlineUsers(): Promise<string[]> {
  try {
    return await execute<string[]>(['SMEMBERS', 'online_users'])
  } catch (error) {
    console.error('Get online users error:', error)
    return []
  }
}

export async function isUserOnline(userId: string): Promise<boolean> {
  try {
    return await exists(`presence:${userId}`)
  } catch (error) {
    return false
  }
}

// ============= CACHE WRAPPER =============

export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = CACHE_TTL.medium
): Promise<{ data: T; cached: boolean }> {
  // Try to get from Redis first
  const existing = await get<T>(key)
  
  if (existing !== null) {
    return { data: existing, cached: true }
  }
  
  // Execute function and cache result
  const data = await fn()
  await set(key, data, ttlSeconds)
  
  return { data, cached: false }
}

// ============= HEALTH CHECK =============

export async function healthCheck(): Promise<{ connected: boolean; latency?: number }> {
  const start = Date.now()
  try {
    await execute(['PING'])
    return { connected: true, latency: Date.now() - start }
  } catch (error) {
    return { connected: false }
  }
}

// Export for type checking
export type NotificationType = 
  | 'lesson_completed'
  | 'unit_completed'
  | 'achievement_unlocked'
  | 'payment_reminder'
  | 'payment_approved'
  | 'group_joined'
  | 'new_lesson_available'
  | 'quiz_passed'
  | 'system'
