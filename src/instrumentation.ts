/**
 * V8.0: Next.js Instrumentation
 * 
 * This file runs once when the Next.js server starts.
 * Used to log migration status on startup.
 * 
 * Requirements: 3.1, 3.2
 */

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import to avoid bundling issues
    const { logMigrationStatus } = await import('@/lib/migration-check')
    
    // Log migration status on server startup
    console.log('V8.0: Checking migration status on startup...')
    await logMigrationStatus()
  }
}
