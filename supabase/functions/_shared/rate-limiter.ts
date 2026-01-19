// Shared rate limiting utilities for edge functions

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetIn: number
}

// Default configurations
export const RATE_LIMITS = {
  default: { windowMs: 60000, maxRequests: 100 },
  strict: { windowMs: 60000, maxRequests: 10 },
  auth: { windowMs: 60000, maxRequests: 5 },
  admin: { windowMs: 60000, maxRequests: 20 }
} as const

// In-memory store for rate limiting
const store = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.default
): RateLimitResult {
  const now = Date.now()
  const record = store.get(identifier)
  
  if (!record || now > record.resetTime) {
    store.set(identifier, { count: 1, resetTime: now + config.windowMs })
    return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs }
  }
  
  if (record.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now }
  }
  
  record.count++
  return { allowed: true, remaining: config.maxRequests - record.count, resetIn: record.resetTime - now }
}

// Cleanup old entries periodically
export function cleanupRateLimitStore() {
  const now = Date.now()
  for (const [key, value] of store) {
    if (now > value.resetTime) {
      store.delete(key)
    }
  }
}
