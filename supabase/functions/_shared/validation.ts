// Shared validation utilities for edge functions

export function validateUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

export function validateEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value) && value.length <= 254
}

export function validateString(value: unknown, minLength = 1, maxLength = 1000): value is string {
  return typeof value === 'string' && value.length >= minLength && value.length <= maxLength
}

export function validateNumber(value: unknown, min?: number, max?: number): value is number {
  if (typeof value !== 'number' || isNaN(value)) return false
  if (min !== undefined && value < min) return false
  if (max !== undefined && value > max) return false
  return true
}

export function validatePassword(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return value.length >= 8 && value.length <= 128
}

export function validateRole(value: unknown): value is 'admin' | 'teacher' | 'student' {
  return value === 'admin' || value === 'teacher' || value === 'student'
}

// Sanitize string to prevent XSS
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// Validate pagination parameters
export function validatePagination(
  limit: unknown,
  offset: unknown,
  maxLimit = 100
): { valid: boolean; limit: number; offset: number; error?: string } {
  const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit
  const parsedOffset = typeof offset === 'string' ? parseInt(offset, 10) : offset
  
  if (!validateNumber(parsedLimit, 1, maxLimit)) {
    return { valid: false, limit: 0, offset: 0, error: `Limit must be between 1 and ${maxLimit}` }
  }
  
  if (!validateNumber(parsedOffset, 0, 100000)) {
    return { valid: false, limit: 0, offset: 0, error: 'Offset must be a non-negative number' }
  }
  
  return { valid: true, limit: parsedLimit as number, offset: parsedOffset as number }
}
