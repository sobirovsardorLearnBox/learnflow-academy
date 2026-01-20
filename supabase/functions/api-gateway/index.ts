import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

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

// In-memory fallback cache
const memoryCache = new Map<string, { data: unknown; expiry: number }>()

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

// Multi-layer cache getter
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
    return { data: memData.data as T, source: 'memory' }
  }
  
  memoryCache.delete(key)
  return { data: null, source: null }
}

// Multi-layer cache setter
async function setCache(key: string, data: unknown, ttlSeconds: number): Promise<void> {
  // Set in Redis if available
  if (REDIS_ENABLED) {
    await redisSet(key, data, ttlSeconds)
  }
  
  // Also set in memory cache as fallback
  memoryCache.set(key, { data, expiry: Date.now() + (ttlSeconds * 1000) })
}

// Invalidate cache pattern
async function invalidateCache(pattern: string): Promise<void> {
  // Redis invalidation
  if (REDIS_ENABLED) {
    await redisInvalidatePattern(pattern)
  }
  
  // Memory cache invalidation
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern.replace('*', ''))) {
      memoryCache.delete(key)
    }
  }
}

// Main handler
Deno.serve(async (req) => {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()
  
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
