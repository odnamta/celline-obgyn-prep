/**
 * V13: Organization Authorization
 * Pure functions for org-level permission checks.
 * Independently testable without database dependencies.
 */

import type { OrgRole } from '@/types/database'

export interface OrgAuthorizationResult {
  authorized: boolean
  reason: 'authorized' | 'no_user' | 'no_org' | 'insufficient_role' | 'not_member'
}

/**
 * Checks if a role has at least the minimum required role level.
 * Role hierarchy: owner > admin > creator > candidate
 */
const ROLE_LEVELS: Record<OrgRole, number> = {
  candidate: 0,
  creator: 1,
  admin: 2,
  owner: 3,
}

export function hasMinimumRole(userRole: OrgRole, requiredRole: OrgRole): boolean {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole]
}

/**
 * Checks if a user can manage content in an organization.
 * Requires at least 'creator' role.
 */
export function canManageContent(
  userId: string | null,
  orgId: string | null,
  memberRole: OrgRole | null
): OrgAuthorizationResult {
  if (!userId) return { authorized: false, reason: 'no_user' }
  if (!orgId) return { authorized: false, reason: 'no_org' }
  if (!memberRole) return { authorized: false, reason: 'not_member' }
  if (!hasMinimumRole(memberRole, 'creator')) {
    return { authorized: false, reason: 'insufficient_role' }
  }
  return { authorized: true, reason: 'authorized' }
}

/**
 * Checks if a user can manage org settings and members.
 * Requires at least 'admin' role.
 */
export function canManageOrg(
  userId: string | null,
  orgId: string | null,
  memberRole: OrgRole | null
): OrgAuthorizationResult {
  if (!userId) return { authorized: false, reason: 'no_user' }
  if (!orgId) return { authorized: false, reason: 'no_org' }
  if (!memberRole) return { authorized: false, reason: 'not_member' }
  if (!hasMinimumRole(memberRole, 'admin')) {
    return { authorized: false, reason: 'insufficient_role' }
  }
  return { authorized: true, reason: 'authorized' }
}

/**
 * Checks if a user can delete an organization.
 * Requires 'owner' role.
 */
export function canDeleteOrg(
  userId: string | null,
  orgId: string | null,
  memberRole: OrgRole | null
): OrgAuthorizationResult {
  if (!userId) return { authorized: false, reason: 'no_user' }
  if (!orgId) return { authorized: false, reason: 'no_org' }
  if (!memberRole) return { authorized: false, reason: 'not_member' }
  if (!hasMinimumRole(memberRole, 'owner')) {
    return { authorized: false, reason: 'insufficient_role' }
  }
  return { authorized: true, reason: 'authorized' }
}
