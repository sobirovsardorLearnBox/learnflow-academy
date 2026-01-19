import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100 // requests per window
const RATE_LIMIT_STRICT_MAX = 10 // for sensitive endpoints

// In-memory rate limit store (resets on cold start, but effective for hot instances)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

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

// Rate limiting function
function checkRateLimit(identifier: string, isStrict = false): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const maxRequests = isStrict ? RATE_LIMIT_STRICT_MAX : RATE_LIMIT_MAX_REQUESTS
  
  const record = rateLimitStore.get(identifier)
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remaining: maxRequests - 1, resetIn: RATE_LIMIT_WINDOW_MS }
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now }
  }
  
  record.count++
  return { allowed: true, remaining: maxRequests - record.count, resetIn: record.resetTime - now }
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
function successResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString()
    }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

// Cache store for expensive queries
const cache = new Map<string, { data: unknown; expiry: number }>()

function getCached<T>(key: string): T | null {
  const cached = cache.get(key)
  if (!cached || Date.now() > cached.expiry) {
    cache.delete(key)
    return null
  }
  return cached.data as T
}

function setCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiry: Date.now() + ttlMs })
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
    const rateLimit = checkRateLimit(rateLimitKey, isStrictEndpoint)
    
    if (!rateLimit.allowed) {
      logRequest({ ...requestLog, status: 429, duration: Date.now() - startTime })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(rateLimit.resetIn / 1000)
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetIn / 1000))
          }
        }
      )
    }
    
    // Add rate limit headers to all responses
    const rateLimitHeaders = {
      'X-RateLimit-Remaining': String(rateLimit.remaining),
      'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetIn / 1000)),
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
      const cached = getCached<unknown>(cacheKey)
      if (cached) {
        logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime })
        return new Response(
          JSON.stringify({ success: true, data: cached, cached: true, timestamp: new Date().toISOString() }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
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
      setCache(cacheKey, result, 30000)
      
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
      const cached = getCached<unknown>(cacheKey)
      if (cached) {
        logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime })
        return new Response(
          JSON.stringify({ success: true, data: cached, cached: true, timestamp: new Date().toISOString() }),
          { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' } }
        )
      }
      
      const { data, error } = await supabaseClient.rpc('get_dashboard_stats')
      if (error) throw error
      
      setCache(cacheKey, data, 60000)
      
      logRequest({ ...requestLog, status: 200, duration: Date.now() - startTime })
      return new Response(
        JSON.stringify({ success: true, data: data?.[0] || data, cached: false, timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
      )
    }
    
    // ==================== HEALTH CHECK ENDPOINT ====================
    if (path === '/health' && method === 'GET') {
      const { error } = await supabaseClient.from('profiles').select('id').limit(1)
      
      const health = {
        status: error ? 'degraded' : 'healthy',
        database: error ? 'error' : 'connected',
        cache_size: cache.size,
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
      for (const [key] of cache) {
        if (key.startsWith('leaderboard:')) {
          cache.delete(key)
        }
      }
      
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
