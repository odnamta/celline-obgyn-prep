'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server'
import type { ActionResultV2 } from '@/types/actions'

/**
 * Updates user profile metadata (display name).
 *
 * @param displayName - The user's display name
 * @returns ActionResultV2 with success status
 */
export async function updateUserProfile(
  displayName: string
): Promise<ActionResultV2> {
  const user = await getUser()
  if (!user) {
    return { ok: false, error: 'Authentication required' }
  }

  const supabase = await createSupabaseServerClient()

  const updateData: Record<string, unknown> = {}
  if (displayName !== undefined) {
    updateData.full_name = displayName
    updateData.name = displayName
  }

  const { error: updateError } = await supabase.auth.updateUser({
    data: { ...user.user_metadata, ...updateData },
  })

  if (updateError) {
    return { ok: false, error: 'Unable to update profile. Please try again.' }
  }

  // Sync full_name to profiles table
  if (displayName !== undefined) {
    await supabase
      .from('profiles')
      .update({ full_name: displayName })
      .eq('id', user.id)
  }

  revalidatePath('/profile')
  revalidatePath('/dashboard')

  return { ok: true }
}
