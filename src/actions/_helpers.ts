/**
 * V13: Server Action Helpers
 * Reusable auth wrappers for server actions.
 *
 * - withUser: For user-level actions (profile, org selection)
 * - withOrgUser: For org-scoped actions (content CRUD, study, etc.)
 */

import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Organization, OrgRole } from '@/types/database'
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, type RateLimitConfig } from '@/lib/rate-limit'

/**
 * Auth context for user-level actions (no org required).
 */
export type AuthContext = {
  user: User
  supabase: SupabaseClient
}

/**
 * Auth context for org-scoped actions.
 * Includes the user's active organization and role within it.
 */
export type OrgAuthContext = {
  user: User
  supabase: SupabaseClient
  org: Organization
  role: OrgRole
}

/**
 * Standard auth error response shape.
 */
export type AuthError = { ok: false; error: 'AUTH_REQUIRED' }

/**
 * Error when user has no organization membership.
 */
export type NoOrgError = { ok: false; error: 'NO_ORGANIZATION' }

/**
 * Error when rate limit is exceeded.
 */
export type RateLimitError = { ok: false; error: 'RATE_LIMIT_EXCEEDED' }

/**
 * Wraps a server action with user authentication.
 * Use this for user-level actions that don't need org context
 * (e.g., profile settings, org selection, creating a new org).
 *
 * @param fn - Callback receiving AuthContext
 * @param rateLimit - Optional rate limit config (defaults to standard)
 */
export async function withUser<T>(
  fn: (ctx: AuthContext) => Promise<T>,
  rateLimit?: RateLimitConfig,
): Promise<T | AuthError | RateLimitError> {
  const user = await getUser()
  if (!user) {
    return { ok: false, error: 'AUTH_REQUIRED' }
  }

  // Rate limit check (keyed by user ID)
  if (rateLimit) {
    const result = await checkRateLimit(`user:${user.id}`, rateLimit)
    if (!result.allowed) {
      return { ok: false, error: 'RATE_LIMIT_EXCEEDED' }
    }
  }

  const supabase = await createSupabaseServerClient()
  return fn({ user, supabase })
}

/**
 * Wraps a server action with user authentication AND org context.
 * Resolves the user's active organization and their role in it.
 *
 * Use this for all content-related actions (decks, cards, tags, study, etc.).
 *
 * Falls back to the user's first organization if no specific org is provided.
 * Returns NO_ORGANIZATION error if the user has no org memberships.
 *
 * @param fn - Callback receiving OrgAuthContext
 * @param orgId - Optional specific org ID (defaults to user's first org)
 * @param rateLimit - Optional rate limit config
 */
export async function withOrgUser<T>(
  fn: (ctx: OrgAuthContext) => Promise<T>,
  orgId?: string,
  rateLimit?: RateLimitConfig,
): Promise<T | AuthError | NoOrgError | RateLimitError> {
  const user = await getUser()
  if (!user) {
    return { ok: false, error: 'AUTH_REQUIRED' }
  }

  // Rate limit check (keyed by user ID + action context)
  if (rateLimit) {
    const result = await checkRateLimit(`org:${user.id}`, rateLimit)
    if (!result.allowed) {
      return { ok: false, error: 'RATE_LIMIT_EXCEEDED' }
    }
  }

  const supabase = await createSupabaseServerClient()

  // Resolve org membership
  let query = supabase
    .from('organization_members')
    .select(`
      role,
      organizations (
        id,
        name,
        slug,
        settings,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', user.id)

  if (orgId) {
    query = query.eq('org_id', orgId)
  }

  const { data: membership, error } = await query
    .order('joined_at', { ascending: true })
    .limit(1)
    .single()

  if (error || !membership || !membership.organizations) {
    return { ok: false, error: 'NO_ORGANIZATION' }
  }

  // Supabase returns the joined org as an object
  const orgData = membership.organizations as unknown as Organization
  const role = membership.role as OrgRole

  return fn({ user, supabase, org: orgData, role })
}

/**
 * Type guard to check if a result is an AuthError.
 */
export function isAuthError(result: unknown): result is AuthError {
  return (
    typeof result === 'object' &&
    result !== null &&
    'ok' in result &&
    result.ok === false &&
    'error' in result &&
    result.error === 'AUTH_REQUIRED'
  )
}

/**
 * Type guard to check if a result is a NoOrgError.
 */
export function isNoOrgError(result: unknown): result is NoOrgError {
  return (
    typeof result === 'object' &&
    result !== null &&
    'ok' in result &&
    result.ok === false &&
    'error' in result &&
    result.error === 'NO_ORGANIZATION'
  )
}
