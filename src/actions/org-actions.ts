'use server'

/**
 * V13: Organization Server Actions
 * CRUD operations for organizations and membership management.
 */

import { revalidatePath } from 'next/cache'
import { withUser, withOrgUser } from '@/actions/_helpers'
import type { ActionResultV2 } from '@/types/actions'
import type { Organization, OrganizationMember, OrgRole } from '@/types/database'
import { createOrgSchema, updateOrgSettingsSchema } from '@/lib/validations'

/**
 * Create a new organization. The creating user becomes the owner.
 */
export async function createOrganization(
  name: string,
  slug: string
): Promise<ActionResultV2<Organization>> {
  return withUser(async ({ user, supabase }) => {
    const validation = createOrgSchema.safeParse({ name, slug })
    if (!validation.success) {
      return { ok: false, error: validation.error.issues[0]?.message ?? 'Validation failed' }
    }

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return { ok: false, error: 'This URL slug is already taken' }
    }

    // Create the organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name, slug })
      .select()
      .single()

    if (orgError || !org) {
      return { ok: false, error: orgError?.message ?? 'Failed to create organization' }
    }

    // Add creating user as owner
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        org_id: org.id,
        user_id: user.id,
        role: 'owner' as OrgRole,
      })

    if (memberError) {
      // Clean up org if membership fails
      await supabase.from('organizations').delete().eq('id', org.id)
      return { ok: false, error: 'Failed to set up organization membership' }
    }

    revalidatePath('/dashboard')
    return { ok: true, data: org as Organization }
  })
}

/**
 * Get all organizations the current user belongs to.
 */
export async function getMyOrganizations(): Promise<ActionResultV2<Array<Organization & { role: OrgRole }>>> {
  return withUser(async ({ user, supabase }) => {
    const { data, error } = await supabase
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
      .order('joined_at', { ascending: true })

    if (error) {
      return { ok: false, error: error.message }
    }

    const orgs = (data ?? [])
      .filter((m) => m.organizations)
      .map((m) => ({
        ...(m.organizations as unknown as Organization),
        role: m.role as OrgRole,
      }))

    return { ok: true, data: orgs }
  })
}

/**
 * Get members of the current user's active organization.
 * Requires at least 'admin' role to see member details.
 */
export async function getOrgMembers(): Promise<ActionResultV2<OrganizationMember[]>> {
  return withOrgUser(async ({ supabase, org }) => {
    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('org_id', org.id)
      .order('joined_at', { ascending: true })

    if (error) {
      return { ok: false, error: error.message }
    }

    return { ok: true, data: (data ?? []) as OrganizationMember[] }
  })
}

/**
 * Update organization settings (name, features, branding).
 * Requires at least 'admin' role.
 */
export async function updateOrgSettings(
  orgId: string,
  updates: { name?: string; settings?: Record<string, unknown> }
): Promise<ActionResultV2<void>> {
  return withOrgUser(async ({ supabase, org, role }) => {
    if (role !== 'owner' && role !== 'admin') {
      return { ok: false, error: 'Only admins and owners can update org settings' }
    }

    const validation = updateOrgSettingsSchema.safeParse({ orgId, ...updates })
    if (!validation.success) {
      return { ok: false, error: validation.error.issues[0]?.message ?? 'Validation failed' }
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.name) updateData.name = updates.name
    if (updates.settings) {
      // Deep merge settings
      const currentSettings = org.settings ?? {}
      updateData.settings = { ...currentSettings, ...updates.settings }
    }

    const { error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', orgId)

    if (error) {
      return { ok: false, error: error.message }
    }

    revalidatePath('/dashboard')
    return { ok: true }
  }, orgId)
}

/**
 * Update a member's role within the organization.
 * Requires 'owner' or 'admin' role. Cannot change own role or demote owners.
 */
export async function updateMemberRole(
  memberId: string,
  newRole: OrgRole
): Promise<ActionResultV2<void>> {
  return withOrgUser(async ({ user, supabase, org, role }) => {
    if (role !== 'owner' && role !== 'admin') {
      return { ok: false, error: 'Insufficient permissions' }
    }

    // Fetch the target member
    const { data: target, error: fetchError } = await supabase
      .from('organization_members')
      .select('*')
      .eq('id', memberId)
      .eq('org_id', org.id)
      .single()

    if (fetchError || !target) {
      return { ok: false, error: 'Member not found' }
    }

    // Cannot change own role
    if (target.user_id === user.id) {
      return { ok: false, error: 'Cannot change your own role' }
    }

    // Only owner can promote to admin/owner
    if (newRole === 'owner' && role !== 'owner') {
      return { ok: false, error: 'Only owners can transfer ownership' }
    }

    // Cannot demote another owner unless you're owner
    if (target.role === 'owner' && role !== 'owner') {
      return { ok: false, error: 'Cannot modify owner role' }
    }

    const { error } = await supabase
      .from('organization_members')
      .update({ role: newRole })
      .eq('id', memberId)

    if (error) {
      return { ok: false, error: error.message }
    }

    revalidatePath('/dashboard')
    return { ok: true }
  })
}

/**
 * Remove a member from the organization.
 * Members can remove themselves. Admins/owners can remove others.
 * Cannot remove the last owner.
 */
export async function removeMember(
  memberId: string
): Promise<ActionResultV2<void>> {
  return withOrgUser(async ({ user, supabase, org, role }) => {
    // Fetch the target member
    const { data: target, error: fetchError } = await supabase
      .from('organization_members')
      .select('*')
      .eq('id', memberId)
      .eq('org_id', org.id)
      .single()

    if (fetchError || !target) {
      return { ok: false, error: 'Member not found' }
    }

    // Check permissions: self-removal always OK, otherwise need admin+
    const isSelf = target.user_id === user.id
    if (!isSelf && role !== 'owner' && role !== 'admin') {
      return { ok: false, error: 'Insufficient permissions' }
    }

    // Cannot remove the last owner
    if (target.role === 'owner') {
      const { count } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('role', 'owner')

      if ((count ?? 0) <= 1) {
        return { ok: false, error: 'Cannot remove the last owner' }
      }
    }

    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId)

    if (error) {
      return { ok: false, error: error.message }
    }

    revalidatePath('/dashboard')
    return { ok: true }
  })
}

/**
 * Check if a feature is enabled for the user's current org.
 */
export async function hasOrgFeature(
  featureName: string
): Promise<ActionResultV2<boolean>> {
  return withOrgUser(async ({ org }) => {
    const features = (org.settings?.features ?? {}) as unknown as Record<string, boolean>
    const enabled = features[featureName] ?? false
    return { ok: true, data: enabled }
  })
}
