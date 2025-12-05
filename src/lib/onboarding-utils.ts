/**
 * Onboarding Utility Functions
 * V10.4: The Complete Onboarding Overhaul
 * 
 * Pure functions for onboarding logic, designed for property-based testing.
 */

import type { DeckVisibility } from '@/types/database'

/**
 * Determines if user should see Welcome Mode on the dashboard.
 * Welcome Mode is shown when the user has no subscribed decks AND no cards.
 * 
 * Requirements: 3.1
 * Property 1: Returns true iff subscribedDecks=0 AND totalCards=0
 * 
 * @param subscribedDecks - Number of decks the user has subscribed to
 * @param totalCards - Total number of cards across all decks
 * @returns true if Welcome Mode should be displayed
 */
export function shouldShowWelcomeMode(
  subscribedDecks: number,
  totalCards: number
): boolean {
  return subscribedDecks === 0 && totalCards === 0
}

/**
 * Determines if user should be redirected from dashboard to library.
 * Redirect happens when user has no subscribed decks.
 * 
 * Requirements: 4.1, 4.2
 * Property 3: Returns true iff subscribedDecks=0
 * 
 * @param subscribedDecks - Number of decks the user has subscribed to
 * @returns true if user should be redirected to /library
 */
export function shouldRedirectToLibrary(subscribedDecks: number): boolean {
  return subscribedDecks === 0
}

/**
 * Checks if a user is an admin (can create decks).
 * 
 * Requirements: 3.4, 3.5
 * Property 2: Returns true iff userId is in adminIds
 * 
 * @param userId - The user's ID
 * @param adminIds - List of admin user IDs
 * @returns true if user is an admin
 */
export function isUserAdmin(userId: string, adminIds: string[]): boolean {
  return adminIds.includes(userId)
}

/**
 * Determines if the Visibility toggle should be shown for a deck.
 * Only the deck author can see and modify visibility settings.
 * 
 * Requirements: 5.1, 5.4
 * Property 4: Returns true iff userId equals authorId
 * 
 * @param userId - The current user's ID
 * @param authorId - The deck author's ID
 * @returns true if Visibility toggle should be displayed
 */
export function shouldShowVisibilityToggle(
  userId: string,
  authorId: string
): boolean {
  return userId === authorId
}

/**
 * Deck type for filtering (minimal interface for the filter function)
 */
interface FilterableDeck {
  id: string
  visibility: DeckVisibility
  author_id: string
}

/**
 * Filters decks for a user's library view based on visibility rules.
 * - Public decks are visible to everyone
 * - Private decks are only visible to their author
 * 
 * Requirements: 5.2, 5.3
 * Property 5: Private decks hidden from non-authors
 * 
 * @param decks - Array of decks to filter
 * @param userId - The current user's ID
 * @returns Filtered array of decks visible to the user
 */
export function filterDecksForUser<T extends FilterableDeck>(
  decks: T[],
  userId: string
): T[] {
  return decks.filter(deck => {
    // Public decks are visible to everyone
    if (deck.visibility === 'public') {
      return true
    }
    // Private decks are only visible to the author
    return deck.author_id === userId
  })
}

/**
 * Admin user IDs for the application.
 * In production, this would come from environment variables or database.
 */
export const ADMIN_USER_IDS: string[] = [
  // Add admin user IDs here
  // Example: process.env.ADMIN_USER_ID || ''
]
