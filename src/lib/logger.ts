/**
 * V22: Structured error logger.
 *
 * Outputs structured JSON to stderr — Vercel log drain picks this up automatically.
 * Replace bare console.error calls with logger.error() for searchable, contextual logs.
 *
 * Future: Add Sentry/Axiom transport via SENTRY_DSN or AXIOM_TOKEN env vars.
 */

type LogLevel = 'error' | 'warn' | 'info'

interface LogEntry {
  level: LogLevel
  action: string
  message: string
  timestamp: string
  error?: string
  stack?: string
  meta?: Record<string, unknown>
}

function formatEntry(entry: LogEntry): string {
  return JSON.stringify(entry)
}

function log(level: LogLevel, action: string, error: unknown, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    action,
    message: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString(),
    ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
    ...(meta ? { meta } : {}),
  }

  if (level === 'error') {
    console.error(formatEntry(entry))
  } else if (level === 'warn') {
    console.warn(formatEntry(entry))
  } else {
    console.info(formatEntry(entry))
  }
}

export const logger = {
  error(action: string, error: unknown, meta?: Record<string, unknown>) {
    log('error', action, error, meta)
  },
  warn(action: string, message: string, meta?: Record<string, unknown>) {
    log('warn', action, message, meta)
  },
  info(action: string, message: string, meta?: Record<string, unknown>) {
    log('info', action, message, meta)
  },
}
