import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

// CORS configuration with origin validation
const ALLOWED_ORIGINS = [
  'https://learnbox-core.lovable.app',
  'https://id-preview--8d001eef-d6cc-49d5-a0dd-9c9d92befbcf.lovable.app',
]

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  if (ALLOWED_ORIGINS.includes(origin)) return true
  if (origin.endsWith('.lovable.app')) return true
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true
  return false
}

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin')
  const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0]
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin || ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  }
}

// Store current request's CORS headers (set per request)
let corsHeaders: Record<string, string> = {}

// Redis configuration
const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL') || ''
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || ''
const REDIS_ENABLED = !!(REDIS_URL && REDIS_TOKEN)

// Redis helper functions
async function redisExecute<T = unknown>(command: string[]): Promise<T | null> {
  if (!REDIS_ENABLED) return null

  try {
    const response = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    })

    if (!response.ok) {
      console.error(`Redis error: ${response.status}`)
      return null
    }

    const data = await response.json()
    return data.result as T
  } catch (error) {
    console.error('Redis request failed:', error)
    return null
  }
}

async function redisGet<T>(key: string): Promise<T | null> {
  const result = await redisExecute<string | null>(['GET', key])
  if (result === null) return null
  try {
    return JSON.parse(result) as T
  } catch {
    return null
  }
}

async function redisSet(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
  const result = await redisExecute(['SET', key, JSON.stringify(value), 'EX', String(ttlSeconds)])
  return result !== null
}

async function redisIncrWithTTL(key: string, ttlSeconds: number): Promise<number> {
  try {
    const response = await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(ttlSeconds)]
      ]),
    })

    if (!response.ok) return 0
    const results = await response.json()
    return results[0]?.result || 0
  } catch {
    return 0
  }
}

async function redisInvalidatePattern(pattern: string): Promise<number> {
  try {
    let cursor = '0'
    let deleted = 0
    
    do {
      const result = await redisExecute<[string, string[]]>(['SCAN', cursor, 'MATCH', pattern, 'COUNT', '100'])
      if (!result) break
      
      const [newCursor, keys] = result
      cursor = newCursor
      
      if (keys.length > 0) {
        await redisExecute(['DEL', ...keys])
        deleted += keys.length
      }
    } while (cursor !== '0')
    
    return deleted
  } catch {
    return 0
  }
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100 // requests per window
const RATE_LIMIT_STRICT_MAX = 10 // for sensitive endpoints

// In-memory fallback rate limit store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// In-memory fallback cache with LRU-like cleanup
const MAX_MEMORY_CACHE_SIZE = 500
const memoryCache = new Map<string, { data: unknown; expiry: number; hits: number }>()

// Cache TTL configuration (in seconds)
const CACHE_CONFIG = {
  leaderboard: 30,        // 30 seconds - frequently updated
  dashboard_stats: 60,    // 1 minute
  sections: 300,          // 5 minutes - rarely changes
  levels: 300,            // 5 minutes
  units: 300,             // 5 minutes
  lessons: 180,           // 3 minutes
  user_progress: 60,      // 1 minute - user specific
  user_groups: 120,       // 2 minutes
  group_members: 120,     // 2 minutes
  quiz_questions: 300,    // 5 minutes
  // Batch progress endpoints
  section_progress: 45,   // 45 seconds
  level_progress: 45,     // 45 seconds
  unit_progress: 45,      // 45 seconds
  user_courses: 120,      // 2 minutes
} as const

// Request logging
interface RequestLog {
  timestamp: string
  method: string
  path: string
  userId?: string
  ip?: string
  duration?: number
  status?: number
  error?: string
  cached?: boolean
  cacheType?: 'redis' | 'memory'
  cacheKey?: string
}

function logRequest(log: RequestLog) {
  console.log(JSON.stringify({
    level: 'info',
    type: 'request',
    ...log
  }))
}

function logError(message: string, error: unknown, context?: Record<string, unknown>) {
  console.error(JSON.stringify({
    level: 'error',
    type: 'error',
    message,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context
  }))
}

// Rate limiting function with Redis support
async function checkRateLimit(identifier: string, isStrict = false): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const maxRequests = isStrict ? RATE_LIMIT_STRICT_MAX : RATE_LIMIT_MAX_REQUESTS
  const windowSeconds = 60
  
  // Try Redis first
  if (REDIS_ENABLED) {
    const now = Math.floor(Date.now() / 1000)
    const windowKey = `ratelimit:${identifier}:${Math.floor(now / windowSeconds)}`
    
    const count = await redisIncrWithTTL(windowKey, windowSeconds)
    if (count > 0) {
      const remaining = Math.max(0, maxRequests - count)
      const resetIn = windowSeconds - (now % windowSeconds)
      
      return {
        allowed: count <= maxRequests,
        remaining,
        resetIn
      }
    }
  }
  
  // Fallback to in-memory
  const now = Date.now()
  const record = rateLimitStore.get(identifier)
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remaining: maxRequests - 1, resetIn: 60 }
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetIn: Math.ceil((record.resetTime - now) / 1000) }
  }
  
  record.count++
  return { allowed: true, remaining: maxRequests - record.count, resetIn: Math.ceil((record.resetTime - now) / 1000) }
}

// Input validation helpers
function validateUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

function validateEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value) && value.length <= 254
}

function validateString(value: unknown, minLength = 1, maxLength = 1000): value is string {
  return typeof value === 'string' && value.length >= minLength && value.length <= maxLength
}

function validateNumber(value: unknown, min?: number, max?: number): value is number {
  if (typeof value !== 'number' || isNaN(value)) return false
  if (min !== undefined && value < min) return false
  if (max !== undefined && value > max) return false
  return true
}

// Sanitize input to prevent XSS
function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// Error response helper
function errorResponse(status: number, message: string, details?: unknown) {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      details: details || undefined,
      timestamp: new Date().toISOString()
    }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

// Success response helper
function successResponse(data: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString()
    }),
    { 
      status, 
      headers: { ...corsHeaders, ...extraHeaders, 'Content-Type': 'application/json' }
    }
  )
}

// Multi-layer cache getter with hit tracking
async function getCached<T>(key: string): Promise<{ data: T | null; source: 'redis' | 'memory' | null }> {
  // Try Redis first
  if (REDIS_ENABLED) {
    const redisData = await redisGet<T>(key)
    if (redisData !== null) {
      return { data: redisData, source: 'redis' }
    }
  }
  
  // Fallback to memory cache
  const memData = memoryCache.get(key)
  if (memData && Date.now() <= memData.expiry) {
    memData.hits++
    return { data: memData.data as T, source: 'memory' }
  }
  
  memoryCache.delete(key)
  return { data: null, source: null }
}

// Multi-layer cache setter with LRU cleanup
async function setCache(key: string, data: unknown, ttlSeconds: number): Promise<void> {
  // Set in Redis if available
  if (REDIS_ENABLED) {
    await redisSet(key, data, ttlSeconds)
  }
  
  // LRU-like cleanup if memory cache is too large
  if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
    const now = Date.now()
    let lowestHits = Infinity
    let lowestHitsKey: string | null = null
    
    // Remove expired entries and find lowest hit entry
    for (const [k, v] of memoryCache) {
      if (now > v.expiry) {
        memoryCache.delete(k)
      } else if (v.hits < lowestHits) {
        lowestHits = v.hits
        lowestHitsKey = k
      }
    }
    
    // If still too large, remove lowest hit entry
    if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE && lowestHitsKey) {
      memoryCache.delete(lowestHitsKey)
    }
  }
  
  // Set in memory cache as fallback
  memoryCache.set(key, { data, expiry: Date.now() + (ttlSeconds * 1000), hits: 1 })
}

// Invalidate cache pattern
async function invalidateCache(pattern: string): Promise<void> {
  // Redis invalidation
  if (REDIS_ENABLED) {
    await redisInvalidatePattern(pattern)
  }
  
  // Memory cache invalidation
  const searchPattern = pattern.replace('*', '')
  for (const key of memoryCache.keys()) {
    if (key.includes(searchPattern)) {
      memoryCache.delete(key)
    }
  }
}

// Generate cache key for user-specific data
function userCacheKey(prefix: string, userId: string, ...parts: string[]): string {
  return `${prefix}:${userId}:${parts.join(':')}`
}

// Generate cache key for public data
function publicCacheKey(prefix: string, ...parts: string[]): string {
  return `${prefix}:${parts.join(':')}`
}

// Main handler
Deno.serve(async (req) => {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()
  
  // Set CORS headers for this request
  corsHeaders = getCorsHeaders(req)
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  const url = new URL(req.url)
  const path = url.pathname.replace('/api-gateway', '')
  const method = req.method
  
  // Get client IP for rate limiting
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   req.headers.get('cf-connecting-ip') || 
                   'unknown'
  
  const requestLog: RequestLog = {
    timestamp: new Date().toISOString(),
    method,
    path,
    ip: clientIP
  }
  
  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Check authentication
    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null
    let userRole: string | null = null
    
    // Create client with user's auth token if provided
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} }
    })
    
    // Admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verify JWT if auth header present
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: claims, error: claimsError } = await supabaseClient.auth.getClaims(token)
      
      if (!claimsError && claims?.claims) {
        userId = claims.claims.sub as string
        requestLog.userId = userId
        
        // Get user role
        const { data: roleData } = await supabaseClient
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single()
        
        userRole = roleData?.role || null
      }
    }
    
    // Rate limiting - use userId if authenticated, otherwise IP
    const rateLimitKey = userId || clientIP
    const isStrictEndpoint = path.includes('/admin') || path.includes('/create') || path.includes('/delete')
    const rateLimit = await checkRateLimit(rateLimitKey, isStrictEndpoint)
    
    if (!rateLimit.allowed) {
      logRequest({ ...requestLog, status: 429, duration: Date.now() - startTime })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: rateLimit.resetIn
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.resetIn),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.resetIn)
          }
        }
      )
    }
    
    // Add rate limit headers to all responses
    const rateLimitHeaders = {
      'X-RateLimit-Remaining': String(rateLimit.remaining),
      'X-RateLimit-Reset': String(rateLimit.resetIn),
      'X-Request-ID': requestId
    }
    
    // Route handling
    // ==================== LEADERBOARD ENDPOINTS ====================
    if (path === '/leaderboard' && method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '50')
      const offset = parseInt(url.searchParams.get('offset') || '0')
      const groupId = url.searchParams.get('group_id')
      
      // Validate pagination params
      if (!validateNumber(limit, 1, 100) || !validateNumber(offset, 0, 10000)) {
        return errorResponse(400, 'Invalid pagination parameters')
      }
      
      // Check cache first
      const cacheKey = `leaderboard:${groupId || 'global'}:${limit}:${offset}`
      const cachedResult = await getCached<unknown>(cacheKey)
      if (cachedResult.data !== null) {
        logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cached: true, cacheType: cachedResult.source || undefined })
        return new Response(
          JSON.stringify({ success: true, data: cachedResult.data, cached: true, timestamp: new Date().toISOString() }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT', 'X-Cache-Source': cachedResult.source || 'unknown' } }
        )
      }
      
      let result
      if (groupId) {
        if (!validateUUID(groupId)) {
          return errorResponse(400, 'Invalid group_id format')
        }
        const { data, error } = await supabaseClient.rpc('get_group_leaderboard_optimized', {
          group_id_param: groupId,
          limit_count: limit,
          offset_count: offset
        })
        if (error) throw error
        result = data
      } else {
        const { data, error } = await supabaseClient.rpc('get_student_leaderboard_optimized', {
          limit_count: limit,
          offset_count: offset
        })
        if (error) throw error
        result = data
      }
      
      // Cache for 30 seconds
      await setCache(cacheKey, result, 30)
      
      logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime })
      return new Response(
        JSON.stringify({ success: true, data: result, cached: false, timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
      )
    }
    
    // ==================== USER RANK ENDPOINT ====================
    if (path === '/user-rank' && method === 'GET') {
      if (!userId) {
        return errorResponse(401, 'Authentication required')
      }
      
      const targetUserId = url.searchParams.get('user_id') || userId
      if (!validateUUID(targetUserId)) {
        return errorResponse(400, 'Invalid user_id format')
      }
      
      const { data, error } = await supabaseClient.rpc('get_user_rank', {
        target_user_id: targetUserId
      })
      
      if (error) throw error
      
      logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime })
      return successResponse({ rank: data })
    }
    
    // ==================== DASHBOARD STATS ENDPOINT ====================
    if (path === '/dashboard-stats' && method === 'GET') {
      if (!userId || !['admin', 'teacher'].includes(userRole || '')) {
        return errorResponse(403, 'Admin or teacher access required')
      }
      
      // Cache for 60 seconds
      const cacheKey = 'dashboard_stats'
      const cachedStats = await getCached<unknown>(cacheKey)
      if (cachedStats.data !== null) {
        logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cached: true, cacheType: cachedStats.source || undefined })
        return new Response(
          JSON.stringify({ success: true, data: cachedStats.data, cached: true, timestamp: new Date().toISOString() }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
        )
      }
      
      const { data, error } = await supabaseClient.rpc('get_dashboard_stats')
      if (error) throw error
      
      await setCache(cacheKey, data, 60)
      
      logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime })
      return new Response(
        JSON.stringify({ success: true, data: data?.[0] || data, cached: false, timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
      )
    }
    
    // ==================== HEALTH CHECK ENDPOINT ====================
    if (path === '/health' && method === 'GET') {
      const { error } = await supabaseClient.from('profiles').select('id').limit(1)
      
      // Check Redis health
      let redisStatus = 'not_configured'
      if (REDIS_ENABLED) {
        try {
          await redisExecute(['PING'])
          redisStatus = 'connected'
        } catch {
          redisStatus = 'error'
        }
      }
      
      const health = {
        status: error ? 'degraded' : 'healthy',
        database: error ? 'error' : 'connected',
        redis: redisStatus,
        memory_cache_size: memoryCache.size,
        rate_limit_entries: rateLimitStore.size,
        timestamp: new Date().toISOString()
      }
      
      logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime })
      return successResponse(health)
    }
    
    // ==================== SECTIONS ENDPOINT (CACHED) ====================
    if (path === '/sections' && method === 'GET') {
      const cacheKey = publicCacheKey('sections', 'all')
      const cachedResult = await getCached<unknown>(cacheKey)
      
      if (cachedResult.data !== null) {
        logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cached: true, cacheType: cachedResult.source || undefined, cacheKey })
        return new Response(
          JSON.stringify({ success: true, data: cachedResult.data, cached: true, timestamp: new Date().toISOString() }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT', 'X-Cache-Source': cachedResult.source || 'unknown' } }
        )
      }
      
      const { data, error } = await supabaseClient
        .from('sections')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      
      if (error) throw error
      
      await setCache(cacheKey, data, CACHE_CONFIG.sections)
      
      logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cacheKey })
      return new Response(
        JSON.stringify({ success: true, data, cached: false, timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
      )
    }
    
    // ==================== LEVELS ENDPOINT (CACHED) ====================
    if (path === '/levels' && method === 'GET') {
      const sectionId = url.searchParams.get('section_id')
      
      if (sectionId && !validateUUID(sectionId)) {
        return errorResponse(400, 'Invalid section_id format')
      }
      
      const cacheKey = publicCacheKey('levels', sectionId || 'all')
      const cachedResult = await getCached<unknown>(cacheKey)
      
      if (cachedResult.data !== null) {
        logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cached: true, cacheType: cachedResult.source || undefined, cacheKey })
        return new Response(
          JSON.stringify({ success: true, data: cachedResult.data, cached: true, timestamp: new Date().toISOString() }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
        )
      }
      
      let query = supabaseClient
        .from('levels')
        .select('*')
        .eq('is_active', true)
        .order('level_number', { ascending: true })
      
      if (sectionId) {
        query = query.eq('section_id', sectionId)
      }
      
      const { data, error } = await query
      if (error) throw error
      
      await setCache(cacheKey, data, CACHE_CONFIG.levels)
      
      logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cacheKey })
      return new Response(
        JSON.stringify({ success: true, data, cached: false, timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
      )
    }
    
    // ==================== UNITS ENDPOINT (CACHED) ====================
    if (path === '/units' && method === 'GET') {
      const levelId = url.searchParams.get('level_id')
      
      if (levelId && !validateUUID(levelId)) {
        return errorResponse(400, 'Invalid level_id format')
      }
      
      const cacheKey = publicCacheKey('units', levelId || 'all')
      const cachedResult = await getCached<unknown>(cacheKey)
      
      if (cachedResult.data !== null) {
        logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cached: true, cacheType: cachedResult.source || undefined, cacheKey })
        return new Response(
          JSON.stringify({ success: true, data: cachedResult.data, cached: true, timestamp: new Date().toISOString() }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
        )
      }
      
      let query = supabaseClient
        .from('units')
        .select('*')
        .eq('is_active', true)
        .order('unit_number', { ascending: true })
      
      if (levelId) {
        query = query.eq('level_id', levelId)
      }
      
      const { data, error } = await query
      if (error) throw error
      
      await setCache(cacheKey, data, CACHE_CONFIG.units)
      
      logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cacheKey })
      return new Response(
        JSON.stringify({ success: true, data, cached: false, timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
      )
    }
    
    // ==================== LESSONS ENDPOINT (CACHED) ====================
    if (path === '/lessons' && method === 'GET') {
      const unitId = url.searchParams.get('unit_id')
      
      if (unitId && !validateUUID(unitId)) {
        return errorResponse(400, 'Invalid unit_id format')
      }
      
      const cacheKey = publicCacheKey('lessons', unitId || 'all')
      const cachedResult = await getCached<unknown>(cacheKey)
      
      if (cachedResult.data !== null) {
        logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cached: true, cacheType: cachedResult.source || undefined, cacheKey })
        return new Response(
          JSON.stringify({ success: true, data: cachedResult.data, cached: true, timestamp: new Date().toISOString() }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
        )
      }
      
      let query = supabaseClient
        .from('lessons')
        .select('id, title, description, lesson_number, duration_minutes, video_url, unit_id, is_active')
        .eq('is_active', true)
        .order('lesson_number', { ascending: true })
      
      if (unitId) {
        query = query.eq('unit_id', unitId)
      }
      
      const { data, error } = await query
      if (error) throw error
      
      await setCache(cacheKey, data, CACHE_CONFIG.lessons)
      
      logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cacheKey })
      return new Response(
        JSON.stringify({ success: true, data, cached: false, timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
      )
    }
    
    // ==================== USER PROGRESS ENDPOINT (CACHED) ====================
    if (path === '/user-progress' && method === 'GET') {
      if (!userId) {
        return errorResponse(401, 'Authentication required')
      }
      
      const unitId = url.searchParams.get('unit_id')
      const cacheKey = userCacheKey('progress', userId, unitId || 'all')
      const cachedResult = await getCached<unknown>(cacheKey)
      
      if (cachedResult.data !== null) {
        logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cached: true, cacheType: cachedResult.source || undefined, cacheKey })
        return new Response(
          JSON.stringify({ success: true, data: cachedResult.data, cached: true, timestamp: new Date().toISOString() }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
        )
      }
      
      let query = supabaseClient
        .from('lesson_progress')
        .select('*')
        .eq('user_id', userId)
      
      if (unitId) {
        if (!validateUUID(unitId)) {
          return errorResponse(400, 'Invalid unit_id format')
        }
        // Get lessons for the unit first
        const { data: lessons } = await supabaseClient
          .from('lessons')
          .select('id')
          .eq('unit_id', unitId)
        
        if (lessons && lessons.length > 0) {
          query = query.in('lesson_id', lessons.map(l => l.id))
        }
      }
      
      const { data, error } = await query
      if (error) throw error
      
      await setCache(cacheKey, data, CACHE_CONFIG.user_progress)
      
      logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cacheKey })
      return new Response(
        JSON.stringify({ success: true, data, cached: false, timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
      )
    }
    
    // ==================== USER GROUPS ENDPOINT (CACHED) ====================
    if (path === '/user-groups' && method === 'GET') {
      if (!userId) {
        return errorResponse(401, 'Authentication required')
      }
      
      const cacheKey = userCacheKey('groups', userId)
      const cachedResult = await getCached<unknown>(cacheKey)
      
      if (cachedResult.data !== null) {
        logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cached: true, cacheType: cachedResult.source || undefined, cacheKey })
        return new Response(
          JSON.stringify({ success: true, data: cachedResult.data, cached: true, timestamp: new Date().toISOString() }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
        )
      }
      
      const { data, error } = await supabaseClient
        .from('group_members')
        .select(`
          group_id,
          is_approved,
          joined_at,
          groups (
            id,
            name,
            description,
            is_active,
            teacher_id
          )
        `)
        .eq('user_id', userId)
        .eq('is_approved', true)
      
      if (error) throw error
      
      await setCache(cacheKey, data, CACHE_CONFIG.user_groups)
      
      logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cacheKey })
      return new Response(
        JSON.stringify({ success: true, data, cached: false, timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
      )
    }
    
    // ==================== QUIZ QUESTIONS ENDPOINT (CACHED) ====================
    if (path === '/quiz-questions' && method === 'GET') {
      const lessonId = url.searchParams.get('lesson_id')
      
      if (!lessonId || !validateUUID(lessonId)) {
        return errorResponse(400, 'Valid lesson_id is required')
      }
      
      const cacheKey = publicCacheKey('quiz', lessonId)
      const cachedResult = await getCached<unknown>(cacheKey)
      
      if (cachedResult.data !== null) {
        logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cached: true, cacheType: cachedResult.source || undefined, cacheKey })
        return new Response(
          JSON.stringify({ success: true, data: cachedResult.data, cached: true, timestamp: new Date().toISOString() }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
        )
      }
      
      const { data, error } = await supabaseClient.rpc('get_quiz_questions', {
        p_lesson_id: lessonId
      })
      
      if (error) throw error
      
      await setCache(cacheKey, data, CACHE_CONFIG.quiz_questions)
      
      logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cacheKey })
      return new Response(
        JSON.stringify({ success: true, data, cached: false, timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
      )
    }
    
    // ==================== CACHE STATS ENDPOINT (ADMIN ONLY) ====================
    if (path === '/cache-stats' && method === 'GET') {
      if (!userId || userRole !== 'admin') {
        return errorResponse(403, 'Admin access required')
      }
      
      const stats = {
        memory_cache: {
          size: memoryCache.size,
          max_size: MAX_MEMORY_CACHE_SIZE,
          keys: Array.from(memoryCache.keys()).slice(0, 50)
        },
        rate_limit_entries: rateLimitStore.size,
        redis_enabled: REDIS_ENABLED,
        cache_config: CACHE_CONFIG,
        timestamp: new Date().toISOString()
      }
      
      logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime })
      return successResponse(stats)
    }
    
    // ==================== CACHE INVALIDATION ENDPOINT (ADMIN ONLY) ====================
    if (path === '/cache/invalidate' && method === 'POST') {
      if (!userId || userRole !== 'admin') {
        return errorResponse(403, 'Admin access required')
      }
      
      const body = await req.json()
      const pattern = body.pattern || '*'
      
      await invalidateCache(pattern)
      
      logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime })
      return successResponse({ invalidated: true, pattern })
    }
    
    // ==================== PROGRESS SYNC ENDPOINT ====================
    if (path === '/progress/sync' && method === 'POST') {
      if (!userId) {
        return errorResponse(401, 'Authentication required')
      }
      
      const body = await req.json()
      
      // Validate input
      if (!validateUUID(body.lesson_id)) {
        return errorResponse(400, 'Invalid lesson_id')
      }
      
      // Upsert lesson progress
      const { error } = await supabaseClient
        .from('lesson_progress')
        .upsert({
          user_id: userId,
          lesson_id: body.lesson_id,
          completed: body.completed === true,
          completed_at: body.completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,lesson_id'
        })
      
      if (error) throw error
      
      // Invalidate leaderboard cache
      await invalidateCache('leaderboard:*')
      
      logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime })
      return successResponse({ synced: true })
    }
    
    // ==================== QUIZ VALIDATION ENDPOINT ====================
    if (path === '/quiz/check' && method === 'POST') {
      if (!userId) {
        return errorResponse(401, 'Authentication required')
      }
      
      const body = await req.json()
      
      if (!validateUUID(body.quiz_id)) {
        return errorResponse(400, 'Invalid quiz_id')
      }
      
      if (!validateNumber(body.selected_answer, 0, 10)) {
        return errorResponse(400, 'Invalid selected_answer')
      }
      
      const { data, error } = await supabaseClient.rpc('check_quiz_answer', {
        p_quiz_id: body.quiz_id,
        p_selected_answer: body.selected_answer
      })
      
      if (error) throw error
      
      logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime })
      return successResponse(data)
    }
    
    // ==================== BATCH SECTION PROGRESS ENDPOINT ====================
    if (path === '/sections-progress' && method === 'POST') {
      if (!userId) {
        return errorResponse(401, 'Authentication required')
      }
      
      const body = await req.json()
      const sectionIds = body.section_ids as string[]
      
      if (!Array.isArray(sectionIds) || sectionIds.length === 0) {
        return errorResponse(400, 'section_ids array is required')
      }
      
      // Validate all UUIDs
      if (!sectionIds.every(validateUUID)) {
        return errorResponse(400, 'Invalid section_id format')
      }
      
      const cacheKey = userCacheKey('section_progress_batch', userId, sectionIds.sort().join(','))
      const cachedResult = await getCached<unknown>(cacheKey)
      
      if (cachedResult.data !== null) {
        logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cached: true, cacheType: cachedResult.source || undefined, cacheKey })
        return new Response(
          JSON.stringify({ success: true, data: cachedResult.data, cached: true, timestamp: new Date().toISOString() }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
        )
      }
      
      const { data, error } = await supabaseClient.rpc('get_section_progress_batch', {
        p_user_id: userId,
        p_section_ids: sectionIds
      })
      
      if (error) throw error
      
      await setCache(cacheKey, data, CACHE_CONFIG.section_progress)
      
      logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cacheKey })
      return new Response(
        JSON.stringify({ success: true, data, cached: false, timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
      )
    }
    
    // ==================== BATCH LEVEL PROGRESS ENDPOINT ====================
    if (path === '/levels-progress' && method === 'POST') {
      if (!userId) {
        return errorResponse(401, 'Authentication required')
      }
      
      const body = await req.json()
      const levelIds = body.level_ids as string[]
      
      if (!Array.isArray(levelIds) || levelIds.length === 0) {
        return errorResponse(400, 'level_ids array is required')
      }
      
      if (!levelIds.every(validateUUID)) {
        return errorResponse(400, 'Invalid level_id format')
      }
      
      const cacheKey = userCacheKey('level_progress_batch', userId, levelIds.sort().join(','))
      const cachedResult = await getCached<unknown>(cacheKey)
      
      if (cachedResult.data !== null) {
        logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cached: true, cacheType: cachedResult.source || undefined, cacheKey })
        return new Response(
          JSON.stringify({ success: true, data: cachedResult.data, cached: true, timestamp: new Date().toISOString() }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
        )
      }
      
      const { data, error } = await supabaseClient.rpc('get_level_progress_batch', {
        p_user_id: userId,
        p_level_ids: levelIds
      })
      
      if (error) throw error
      
      await setCache(cacheKey, data, CACHE_CONFIG.level_progress)
      
      logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cacheKey })
      return new Response(
        JSON.stringify({ success: true, data, cached: false, timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
      )
    }
    
    // ==================== BATCH UNIT PROGRESS ENDPOINT ====================
    if (path === '/units-progress' && method === 'POST') {
      if (!userId) {
        return errorResponse(401, 'Authentication required')
      }
      
      const body = await req.json()
      const unitIds = body.unit_ids as string[]
      
      if (!Array.isArray(unitIds) || unitIds.length === 0) {
        return errorResponse(400, 'unit_ids array is required')
      }
      
      if (!unitIds.every(validateUUID)) {
        return errorResponse(400, 'Invalid unit_id format')
      }
      
      const cacheKey = userCacheKey('unit_progress_batch', userId, unitIds.sort().join(','))
      const cachedResult = await getCached<unknown>(cacheKey)
      
      if (cachedResult.data !== null) {
        logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cached: true, cacheType: cachedResult.source || undefined, cacheKey })
        return new Response(
          JSON.stringify({ success: true, data: cachedResult.data, cached: true, timestamp: new Date().toISOString() }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
        )
      }
      
      const { data, error } = await supabaseClient.rpc('get_unit_progress_batch', {
        p_user_id: userId,
        p_unit_ids: unitIds
      })
      
      if (error) throw error
      
      await setCache(cacheKey, data, CACHE_CONFIG.unit_progress)
      
      logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cacheKey })
      return new Response(
        JSON.stringify({ success: true, data, cached: false, timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
      )
    }
    
    // ==================== USER COURSES OPTIMIZED ENDPOINT ====================
    if (path === '/user-courses' && method === 'GET') {
      if (!userId) {
        return errorResponse(401, 'Authentication required')
      }
      
      const cacheKey = userCacheKey('user_courses', userId)
      const cachedResult = await getCached<unknown>(cacheKey)
      
      if (cachedResult.data !== null) {
        logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cached: true, cacheType: cachedResult.source || undefined, cacheKey })
        return new Response(
          JSON.stringify({ success: true, data: cachedResult.data, cached: true, timestamp: new Date().toISOString() }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
        )
      }
      
      const { data, error } = await supabaseClient.rpc('get_user_courses_optimized', {
        p_user_id: userId
      })
      
      if (error) throw error
      
      await setCache(cacheKey, data, CACHE_CONFIG.user_courses)
      
      logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime, cacheKey })
      return new Response(
        JSON.stringify({ success: true, data, cached: false, timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
      )
    }
    
    // ==================== NOT FOUND ====================
    logRequest({ ...requestLog, status: 404, duration: Date.now() - startTime })
    return errorResponse(404, 'Endpoint not found', { path, method })
    
  } catch (error) {
    logError('Request failed', error, { path, method, userId: requestLog.userId })
    logRequest({ 
      ...requestLog, 
      status: 500, 
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return errorResponse(500, 'Internal server error', 
      Deno.env.get('ENVIRONMENT') === 'development' 
        ? { message: error instanceof Error ? error.message : String(error) }
        : undefined
    )
  }
})
