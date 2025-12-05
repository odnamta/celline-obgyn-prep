/**
 * Property-Based Tests for V10.4 Onboarding Overhaul
 * Feature: v10.4-onboarding-overhaul
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  shouldShowWelcomeMode,
  shouldRedirectToLibrary,
  isUserAdmin,
  shouldShowVisibilityToggle,
  filterDecksForUser,
} from '@/lib/onboarding-utils'
import type { DeckVisibility } from '@/types/database'

describe('V10.4 Onboarding Overhaul - Property Tests', () => {
  /**
   * **Feature: v10.4-onboarding-overhaul, Property 1: Welcome Mode activation**
   * *For any* combination of subscribedDecks and totalCards values,
   * `shouldShowWelcomeMode` returns true if and only if both subscribedDecks equals 0 AND totalCards equals 0.
   * **Validates: Requirements 3.1**
   */
  describe('Property 1: Welcome Mode activation', () => {
    it('should return true iff subscribedDecks=0 AND totalCards=0', () => {
      fc.assert(
        fc.property(
          fc.nat(100), // subscribedDecks: 0-100
          fc.nat(1000), // totalCards: 0-1000
          (subscribedDecks, totalCards) => {
            const result = shouldShowWelcomeMode(subscribedDecks, totalCards)
            const expected = subscribedDecks === 0 && totalCards === 0
            expect(result).toBe(expected)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return true when both are exactly 0', () => {
      expect(shouldShowWelcomeMode(0, 0)).toBe(true)
    })

    it('should return false when subscribedDecks > 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.nat(1000),
          (subscribedDecks, totalCards) => {
            expect(shouldShowWelcomeMode(subscribedDecks, totalCards)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return false when totalCards > 0', () => {
      fc.assert(
        fc.property(
          fc.nat(100),
          fc.integer({ min: 1, max: 1000 }),
          (subscribedDecks, totalCards) => {
            expect(shouldShowWelcomeMode(subscribedDecks, totalCards)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: v10.4-onboarding-overhaul, Property 2: Admin-conditional Create Deck visibility**
   * *For any* user in Welcome Mode, the "Create my own Deck" action is visible
   * if and only if the user is an admin.
   * **Validates: Requirements 3.4, 3.5**
   */
  describe('Property 2: Admin-conditional Create Deck visibility', () => {
    it('should return true iff userId is in adminIds', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(fc.uuid(), { minLength: 0, maxLength: 10 }),
          (userId, adminIds) => {
            const result = isUserAdmin(userId, adminIds)
            const expected = adminIds.includes(userId)
            expect(result).toBe(expected)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return true when userId is explicitly in adminIds', () => {
      const userId = 'user-123'
      const adminIds = ['admin-1', 'user-123', 'admin-2']
      expect(isUserAdmin(userId, adminIds)).toBe(true)
    })

    it('should return false when userId is not in adminIds', () => {
      const userId = 'user-123'
      const adminIds = ['admin-1', 'admin-2']
      expect(isUserAdmin(userId, adminIds)).toBe(false)
    })

    it('should return false when adminIds is empty', () => {
      fc.assert(
        fc.property(fc.uuid(), (userId) => {
          expect(isUserAdmin(userId, [])).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: v10.4-onboarding-overhaul, Property 3: Zero-deck redirect logic**
   * *For any* user with subscribedDecks count, `shouldRedirectToLibrary` returns true
   * if and only if subscribedDecks equals 0.
   * **Validates: Requirements 4.1, 4.2**
   */
  describe('Property 3: Zero-deck redirect logic', () => {
    it('should return true iff subscribedDecks equals 0', () => {
      fc.assert(
        fc.property(fc.nat(100), (subscribedDecks) => {
          const result = shouldRedirectToLibrary(subscribedDecks)
          const expected = subscribedDecks === 0
          expect(result).toBe(expected)
        }),
        { numRuns: 100 }
      )
    })

    it('should return true when subscribedDecks is 0', () => {
      expect(shouldRedirectToLibrary(0)).toBe(true)
    })

    it('should return false when subscribedDecks > 0', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 100 }), (subscribedDecks) => {
          expect(shouldRedirectToLibrary(subscribedDecks)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: v10.4-onboarding-overhaul, Property 4: Author-conditional Visibility toggle**
   * *For any* user viewing a deck, the Visibility toggle is visible
   * if and only if the user's ID matches the deck's author_id.
   * **Validates: Requirements 5.1, 5.4**
   */
  describe('Property 4: Author-conditional Visibility toggle', () => {
    it('should return true iff userId equals authorId', () => {
      fc.assert(
        fc.property(fc.uuid(), fc.uuid(), (userId, authorId) => {
          const result = shouldShowVisibilityToggle(userId, authorId)
          const expected = userId === authorId
          expect(result).toBe(expected)
        }),
        { numRuns: 100 }
      )
    })

    it('should return true when user is the author', () => {
      const id = 'same-id-123'
      expect(shouldShowVisibilityToggle(id, id)).toBe(true)
    })

    it('should return false when user is not the author', () => {
      expect(shouldShowVisibilityToggle('user-1', 'user-2')).toBe(false)
    })
  })

  /**
   * **Feature: v10.4-onboarding-overhaul, Property 5: Private deck filtering**
   * *For any* deck with visibility="private" and any user who is not the author,
   * the deck should not appear in that user's library browse results.
   * **Validates: Requirements 5.2, 5.3**
   */
  describe('Property 5: Private deck filtering', () => {
    interface TestDeck {
      id: string
      visibility: DeckVisibility
      author_id: string
    }

    const deckArbitrary = fc.record({
      id: fc.uuid(),
      visibility: fc.constantFrom('private', 'public') as fc.Arbitrary<DeckVisibility>,
      author_id: fc.uuid(),
    })

    it('should filter out private decks for non-authors', () => {
      fc.assert(
        fc.property(
          fc.array(deckArbitrary, { minLength: 0, maxLength: 20 }),
          fc.uuid(),
          (decks, userId) => {
            const filtered = filterDecksForUser(decks, userId)
            
            // Every deck in filtered should either be:
            // 1. Public, OR
            // 2. Private but user is the author
            for (const deck of filtered) {
              const isPublic = deck.visibility === 'public'
              const isAuthor = deck.author_id === userId
              expect(isPublic || isAuthor).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include all public decks', () => {
      fc.assert(
        fc.property(
          fc.array(deckArbitrary, { minLength: 0, maxLength: 20 }),
          fc.uuid(),
          (decks, userId) => {
            const filtered = filterDecksForUser(decks, userId)
            const publicDecks = decks.filter(d => d.visibility === 'public')
            
            // All public decks should be in filtered
            for (const publicDeck of publicDecks) {
              expect(filtered.some(d => d.id === publicDeck.id)).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include private decks where user is author', () => {
      fc.assert(
        fc.property(
          fc.array(deckArbitrary, { minLength: 0, maxLength: 20 }),
          fc.uuid(),
          (decks, userId) => {
            const filtered = filterDecksForUser(decks, userId)
            const ownPrivateDecks = decks.filter(
              d => d.visibility === 'private' && d.author_id === userId
            )
            
            // All own private decks should be in filtered
            for (const ownDeck of ownPrivateDecks) {
              expect(filtered.some(d => d.id === ownDeck.id)).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should exclude private decks where user is not author', () => {
      fc.assert(
        fc.property(
          fc.array(deckArbitrary, { minLength: 0, maxLength: 20 }),
          fc.uuid(),
          (decks, userId) => {
            const filtered = filterDecksForUser(decks, userId)
            const othersPrivateDecks = decks.filter(
              d => d.visibility === 'private' && d.author_id !== userId
            )
            
            // No other's private decks should be in filtered
            for (const otherDeck of othersPrivateDecks) {
              expect(filtered.some(d => d.id === otherDeck.id)).toBe(false)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
