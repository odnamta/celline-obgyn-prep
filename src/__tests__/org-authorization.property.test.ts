import { describe, test, expect } from 'vitest'
import fc from 'fast-check'
import {
  hasMinimumRole,
  canManageContent,
  canManageOrg,
  canDeleteOrg,
} from '../lib/org-authorization'
import type { OrgRole } from '@/types/database'

/**
 * V13: Organization Authorization Property Tests
 * Validates role hierarchy and permission checks for multi-tenant org model.
 */

const ALL_ROLES: OrgRole[] = ['candidate', 'creator', 'admin', 'owner']
const ROLE_LEVELS: Record<OrgRole, number> = {
  candidate: 0,
  creator: 1,
  admin: 2,
  owner: 3,
}

const roleArb = fc.constantFrom(...ALL_ROLES)
const uuidArb = fc.uuid()

describe('V13: Org Authorization — Role Hierarchy', () => {
  test('every role has minimum of itself', () => {
    fc.assert(
      fc.property(roleArb, (role) => {
        expect(hasMinimumRole(role, role)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  test('higher roles satisfy lower requirements', () => {
    fc.assert(
      fc.property(roleArb, roleArb, (userRole, requiredRole) => {
        const expected = ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole]
        expect(hasMinimumRole(userRole, requiredRole)).toBe(expected)
      }),
      { numRuns: 100 }
    )
  })

  test('candidate cannot satisfy any role above candidate', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('creator' as OrgRole, 'admin' as OrgRole, 'owner' as OrgRole),
        (requiredRole) => {
          expect(hasMinimumRole('candidate', requiredRole)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('owner satisfies all roles', () => {
    fc.assert(
      fc.property(roleArb, (requiredRole) => {
        expect(hasMinimumRole('owner', requiredRole)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  test('role hierarchy is transitive', () => {
    fc.assert(
      fc.property(roleArb, roleArb, roleArb, (a, b, c) => {
        if (hasMinimumRole(a, b) && hasMinimumRole(b, c)) {
          expect(hasMinimumRole(a, c)).toBe(true)
        }
      }),
      { numRuns: 200 }
    )
  })
})

describe('V13: Org Authorization — canManageContent', () => {
  test('requires userId', () => {
    fc.assert(
      fc.property(uuidArb, roleArb, (orgId, role) => {
        const result = canManageContent(null, orgId, role)
        expect(result.authorized).toBe(false)
        expect(result.reason).toBe('no_user')
      }),
      { numRuns: 100 }
    )
  })

  test('requires orgId', () => {
    fc.assert(
      fc.property(uuidArb, roleArb, (userId, role) => {
        const result = canManageContent(userId, null, role)
        expect(result.authorized).toBe(false)
        expect(result.reason).toBe('no_org')
      }),
      { numRuns: 100 }
    )
  })

  test('requires membership', () => {
    fc.assert(
      fc.property(uuidArb, uuidArb, (userId, orgId) => {
        const result = canManageContent(userId, orgId, null)
        expect(result.authorized).toBe(false)
        expect(result.reason).toBe('not_member')
      }),
      { numRuns: 100 }
    )
  })

  test('requires at least creator role', () => {
    fc.assert(
      fc.property(uuidArb, uuidArb, roleArb, (userId, orgId, role) => {
        const result = canManageContent(userId, orgId, role)
        const expected = ROLE_LEVELS[role] >= ROLE_LEVELS['creator']
        expect(result.authorized).toBe(expected)
        if (!expected) {
          expect(result.reason).toBe('insufficient_role')
        } else {
          expect(result.reason).toBe('authorized')
        }
      }),
      { numRuns: 100 }
    )
  })

  test('candidate cannot manage content', () => {
    fc.assert(
      fc.property(uuidArb, uuidArb, (userId, orgId) => {
        const result = canManageContent(userId, orgId, 'candidate')
        expect(result.authorized).toBe(false)
        expect(result.reason).toBe('insufficient_role')
      }),
      { numRuns: 100 }
    )
  })

  test('creator, admin, owner can manage content', () => {
    fc.assert(
      fc.property(
        uuidArb,
        uuidArb,
        fc.constantFrom('creator' as OrgRole, 'admin' as OrgRole, 'owner' as OrgRole),
        (userId, orgId, role) => {
          const result = canManageContent(userId, orgId, role)
          expect(result.authorized).toBe(true)
          expect(result.reason).toBe('authorized')
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('V13: Org Authorization — canManageOrg', () => {
  test('requires at least admin role', () => {
    fc.assert(
      fc.property(uuidArb, uuidArb, roleArb, (userId, orgId, role) => {
        const result = canManageOrg(userId, orgId, role)
        const expected = ROLE_LEVELS[role] >= ROLE_LEVELS['admin']
        expect(result.authorized).toBe(expected)
      }),
      { numRuns: 100 }
    )
  })

  test('candidate and creator cannot manage org', () => {
    fc.assert(
      fc.property(
        uuidArb,
        uuidArb,
        fc.constantFrom('candidate' as OrgRole, 'creator' as OrgRole),
        (userId, orgId, role) => {
          const result = canManageOrg(userId, orgId, role)
          expect(result.authorized).toBe(false)
          expect(result.reason).toBe('insufficient_role')
        }
      ),
      { numRuns: 100 }
    )
  })

  test('admin and owner can manage org', () => {
    fc.assert(
      fc.property(
        uuidArb,
        uuidArb,
        fc.constantFrom('admin' as OrgRole, 'owner' as OrgRole),
        (userId, orgId, role) => {
          const result = canManageOrg(userId, orgId, role)
          expect(result.authorized).toBe(true)
          expect(result.reason).toBe('authorized')
        }
      ),
      { numRuns: 100 }
    )
  })

  test('null checks match canManageContent behavior', () => {
    fc.assert(
      fc.property(uuidArb, roleArb, (id, role) => {
        expect(canManageOrg(null, id, role).reason).toBe('no_user')
        expect(canManageOrg(id, null, role).reason).toBe('no_org')
        expect(canManageOrg(id, id, null).reason).toBe('not_member')
      }),
      { numRuns: 100 }
    )
  })
})

describe('V13: Org Authorization — canDeleteOrg', () => {
  test('requires owner role', () => {
    fc.assert(
      fc.property(uuidArb, uuidArb, roleArb, (userId, orgId, role) => {
        const result = canDeleteOrg(userId, orgId, role)
        const expected = role === 'owner'
        expect(result.authorized).toBe(expected)
      }),
      { numRuns: 100 }
    )
  })

  test('only owner can delete org', () => {
    fc.assert(
      fc.property(uuidArb, uuidArb, (userId, orgId) => {
        const result = canDeleteOrg(userId, orgId, 'owner')
        expect(result.authorized).toBe(true)
        expect(result.reason).toBe('authorized')
      }),
      { numRuns: 100 }
    )
  })

  test('non-owners cannot delete org', () => {
    fc.assert(
      fc.property(
        uuidArb,
        uuidArb,
        fc.constantFrom('candidate' as OrgRole, 'creator' as OrgRole, 'admin' as OrgRole),
        (userId, orgId, role) => {
          const result = canDeleteOrg(userId, orgId, role)
          expect(result.authorized).toBe(false)
          expect(result.reason).toBe('insufficient_role')
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('V13: Org Authorization — Consistency Properties', () => {
  test('all check functions are pure (deterministic)', () => {
    fc.assert(
      fc.property(
        fc.option(uuidArb, { nil: null }),
        fc.option(uuidArb, { nil: null }),
        fc.option(roleArb, { nil: null }),
        (userId, orgId, role) => {
          const r1 = canManageContent(userId, orgId, role)
          const r2 = canManageContent(userId, orgId, role)
          expect(r1).toEqual(r2)

          const r3 = canManageOrg(userId, orgId, role)
          const r4 = canManageOrg(userId, orgId, role)
          expect(r3).toEqual(r4)

          const r5 = canDeleteOrg(userId, orgId, role)
          const r6 = canDeleteOrg(userId, orgId, role)
          expect(r5).toEqual(r6)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('permission levels are monotonic: content <= org <= delete', () => {
    fc.assert(
      fc.property(uuidArb, uuidArb, roleArb, (userId, orgId, role) => {
        const content = canManageContent(userId, orgId, role).authorized
        const org = canManageOrg(userId, orgId, role).authorized
        const del = canDeleteOrg(userId, orgId, role).authorized

        // If you can delete, you can manage org
        if (del) expect(org).toBe(true)
        // If you can manage org, you can manage content
        if (org) expect(content).toBe(true)
      }),
      { numRuns: 200 }
    )
  })
})
