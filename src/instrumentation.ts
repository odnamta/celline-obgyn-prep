/**
 * V22: Next.js Instrumentation
 *
 * Runs once when the Next.js server starts.
 * Validates env vars and logs migration status.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('@/lib/env')
    validateEnv()

    const { logMigrationStatus } = await import('@/lib/migration-check')
    await logMigrationStatus()
  }
}
