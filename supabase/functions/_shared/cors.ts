/**
 * CORS helper with origin validation
 * Replaces wildcard CORS with allowed origins
 */

// Allowed origins - production and preview domains
const ALLOWED_ORIGINS = [
  'https://learnbox-core.lovable.app',
  'https://id-preview--8d001eef-d6cc-49d5-a0dd-9c9d92befbcf.lovable.app',
];

// Check if origin is allowed (also allow localhost in development)
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  // Allow exact matches
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  
  // Allow any lovable.app subdomain for preview URLs
  if (origin.endsWith('.lovable.app')) return true;
  
  // Allow localhost for local development
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
    return true;
  }
  
  return false;
}

/**
 * Get CORS headers with proper origin validation
 * @param req - The incoming request
 * @returns CORS headers object
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin || ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Handle CORS preflight request
 * @param req - The incoming request
 * @returns Response for OPTIONS request or null if not OPTIONS
 */
export function handleCorsPreFlight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}

/**
 * Create a JSON response with CORS headers
 * @param data - Response data
 * @param status - HTTP status code
 * @param req - The original request (for origin header)
 * @returns Response object
 */
export function jsonResponse(
  data: unknown,
  status: number,
  req: Request
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create an error response with CORS headers
 * @param message - Error message
 * @param status - HTTP status code
 * @param req - The original request
 * @returns Response object
 */
export function errorResponse(
  message: string,
  status: number,
  req: Request
): Response {
  return jsonResponse({ success: false, error: message }, status, req);
}

/**
 * Create a success response with CORS headers
 * @param data - Response data
 * @param req - The original request
 * @param status - HTTP status code (default 200)
 * @returns Response object
 */
export function successResponse(
  data: unknown,
  req: Request,
  status = 200
): Response {
  return jsonResponse(
    { success: true, data, timestamp: new Date().toISOString() },
    status,
    req
  );
}
