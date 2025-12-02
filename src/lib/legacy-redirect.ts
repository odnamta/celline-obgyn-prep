/**
 * V8.1: Legacy ID Resolution Utilities
 * 
 * Provides helper functions to resolve legacy IDs to V2 IDs,
 * enabling seamless redirects for users with old bookmarks.
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface ResolvedId {
  id: string
  isLegacy: boolean
}

/**
 * Resolves a deck ID that may be either a V2 ID or a legacy ID.
 * 
 * @param deckId - The ID from the URL (could be V2 or legacy)
 * @param supabase - Supabase client instance
 * @returns The resolved V2 ID and whether it was a legacy lookup, or null if not found
 */
export async function resolveDeckId(
  deckId: string,
  supabase: SupabaseClient
): Promise<ResolvedId | null> {
  // First, try direct V2 lookup
  const { data: directMatch } = await supabase
    .from('deck_templates')
    .select('id')
    .eq('id', deckId)
    .single()

  if (directMatch) {
    return { id: directMatch.id, isLegacy: false }
  }

  // If not found, try legacy_id lookup
  const { data: legacyMatch } = await supabase
    .from('deck_templates')
    .select('id')
    .eq('legacy_id', deckId)
    .single()

  if (legacyMatch) {
    return { id: legacyMatch.id, isLegacy: true }
  }

  return null
}

/**
 * Resolves a card ID that may be either a V2 ID or a legacy ID.
 * 
 * @param cardId - The ID from the URL (could be V2 or legacy)
 * @param supabase - Supabase client instance
 * @returns The resolved V2 ID and whether it was a legacy lookup, or null if not found
 */
export async function resolveCardId(
  cardId: string,
  supabase: SupabaseClient
): Promise<ResolvedId | null> {
  // First, try direct V2 lookup
  const { data: directMatch } = await supabase
    .from('card_templates')
    .select('id')
    .eq('id', cardId)
    .single()

  if (directMatch) {
    return { id: directMatch.id, isLegacy: false }
  }

  // If not found, try legacy_id lookup
  const { data: legacyMatch } = await supabase
    .from('card_templates')
    .select('id')
    .eq('legacy_id', cardId)
    .single()

  if (legacyMatch) {
    return { id: legacyMatch.id, isLegacy: true }
  }

  return null
}
