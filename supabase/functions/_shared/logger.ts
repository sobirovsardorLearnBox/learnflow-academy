// Structured logging utilities for edge functions

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  requestId?: string
  userId?: string
  path?: string
  method?: string
  duration?: number
  status?: number
  error?: string
  stack?: string
  [key: string]: unknown
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry)
}

export function log(level: LogLevel, message: string, context: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp'>> = {}) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context
  }
  
  switch (level) {
    case 'debug':
      console.debug(formatLog(entry))
      break
    case 'info':
      console.log(formatLog(entry))
      break
    case 'warn':
      console.warn(formatLog(entry))
      break
    case 'error':
      console.error(formatLog(entry))
      break
  }
}

export function logRequest(
  method: string,
  path: string,
  status: number,
  duration: number,
  context: Partial<LogEntry> = {}
) {
  log('info', `${method} ${path} ${status} ${duration}ms`, {
    method,
    path,
    status,
    duration,
    ...context
  })
}

export function logError(
  message: string,
  error: unknown,
  context: Partial<LogEntry> = {}
) {
  log('error', message, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context
  })
}

// Request timing utility
export function createTimer() {
  const start = Date.now()
  return () => Date.now() - start
}
