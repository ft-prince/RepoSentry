/**
 * Minimal structured logger — JSON lines to stdout/stderr so any host
 * (Railway, Fly, Docker) can ship them without an agent.
 */
type Level = 'debug' | 'info' | 'warn' | 'error'

function emit(level: Level, event: string, data?: Record<string, unknown>): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...data })
  // Always stderr: stdout is reserved (the MCP stdio transport runs on it).
  process.stderr.write(line + '\n')
}

export const logger = {
  debug: (event: string, data?: Record<string, unknown>) => emit('debug', event, data),
  info: (event: string, data?: Record<string, unknown>) => emit('info', event, data),
  warn: (event: string, data?: Record<string, unknown>) => emit('warn', event, data),
  error: (event: string, data?: Record<string, unknown>) => emit('error', event, data),
}
