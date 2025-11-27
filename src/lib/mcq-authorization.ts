/**
 * MCQ Authorization Helper
 * Pure functions for verifying MCQ deck ownership.
 * Requirements: 1.3, 3.4
 */

import type { Deck } from '@/types/database';

export interface MCQAuthorizationResult {
  authorized: boolean;
  reason: 'authorized' | 'no_user' | 'deck_not_found' | 'not_owner';
}

/**
 * Checks if a user is authorized to create, read, update, or delete MCQs in a deck.
 * 
 * @param userId - The ID of the user attempting access (null if not authenticated)
 * @param deck - The deck being accessed (null if not found)
 * @returns Authorization result with reason
 * 
 * Requirements: 1.3 - RLS Policy SHALL verify user owns parent deck via deck_id
 * Requirements: 3.4 - Server Action SHALL verify user owns target deck before insertion
 */
export function checkMCQDeckOwnership(
  userId: string | null,
  deck: Deck | null
): MCQAuthorizationResult {
  // No authenticated user
  if (!userId) {
    return { authorized: false, reason: 'no_user' };
  }

  // Deck not found
  if (!deck) {
    return { authorized: false, reason: 'deck_not_found' };
  }

  // User doesn't own the deck
  if (deck.user_id !== userId) {
    return { authorized: false, reason: 'not_owner' };
  }

  // User owns the deck - authorized for MCQ operations
  return { authorized: true, reason: 'authorized' };
}
