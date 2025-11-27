import type { Source, DeckSource, Deck } from '@/types/database';

export interface AuthorizationResult {
  authorized: boolean;
  reason: 'authorized' | 'not_owner' | 'no_user' | 'source_not_found' | 'not_found';
}

/**
 * Check if a user owns a source.
 * Implements RLS logic: auth.uid() = user_id
 */
export function checkSourceOwnership(
  userId: string | null,
  source: Source | null
): AuthorizationResult {
  if (!userId) {
    return { authorized: false, reason: 'no_user' };
  }

  if (!source) {
    return { authorized: false, reason: 'source_not_found' };
  }

  if (source.user_id !== userId) {
    return { authorized: false, reason: 'not_owner' };
  }

  return { authorized: true, reason: 'authorized' };
}

/**
 * Check if a user can access a deck_source record.
 * Implements RLS logic: user owns the deck via deck.user_id = auth.uid()
 */
export function checkDeckSourceOwnership(
  userId: string | null,
  deckSource: DeckSource | null,
  deck: Deck | null
): AuthorizationResult {
  if (!userId) {
    return { authorized: false, reason: 'no_user' };
  }

  if (!deckSource || !deck) {
    return { authorized: false, reason: 'not_found' };
  }

  // Verify deck_source belongs to the deck
  if (deckSource.deck_id !== deck.id) {
    return { authorized: false, reason: 'not_found' };
  }

  // Verify user owns the deck
  if (deck.user_id !== userId) {
    return { authorized: false, reason: 'not_owner' };
  }

  return { authorized: true, reason: 'authorized' };
}

/**
 * Check if a user can access a source file URL.
 * This simulates storage policy: user can only access their own files.
 * In practice, Supabase Storage policies enforce this at the storage level.
 */
export function checkSourceFileAccess(
  userId: string | null,
  source: Source | null
): AuthorizationResult {
  // File access follows the same ownership rules as source records
  return checkSourceOwnership(userId, source);
}
