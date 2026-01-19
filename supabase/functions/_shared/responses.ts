// Shared response utilities for edge functions

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  details?: unknown
  timestamp: string
  cached?: boolean
}

export function corsResponse() {
  return new Response(null, { headers: corsHeaders })
}

export function jsonResponse<T>(
  data: ApiResponse<T>,
  status: number,
  additionalHeaders: Record<string, string> = {}
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...additionalHeaders
    }
  })
}

export function successResponse<T>(data: T, additionalHeaders: Record<string, string> = {}) {
  return jsonResponse(
    {
      success: true,
      data,
      timestamp: new Date().toISOString()
    },
    200,
    additionalHeaders
  )
}

export function errorResponse(
  status: number,
  message: string,
  details?: unknown,
  additionalHeaders: Record<string, string> = {}
) {
  return jsonResponse(
    {
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString()
    },
    status,
    additionalHeaders
  )
}

export function rateLimitResponse(resetIn: number) {
  return jsonResponse(
    {
      success: false,
      error: 'Rate limit exceeded',
      timestamp: new Date().toISOString()
    },
    429,
    {
      'Retry-After': String(Math.ceil(resetIn / 1000)),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(Math.ceil(resetIn / 1000))
    }
  )
}

export function unauthorizedResponse(message = 'Authentication required') {
  return errorResponse(401, message)
}

export function forbiddenResponse(message = 'Access denied') {
  return errorResponse(403, message)
}

export function notFoundResponse(message = 'Resource not found') {
  return errorResponse(404, message)
}

export function badRequestResponse(message: string, details?: unknown) {
  return errorResponse(400, message, details)
}
