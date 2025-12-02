/**
 * V8.6: NeedsReview Filter Property Tests
 * 
 * **Feature: v8.6-no-question-left-behind, Property 7: NeedsReview Filter**
 * **Validates: Requirements 4.3**
 * 
 * For any list of cards, filtering by NeedsReview SHALL return exactly the subset
 * of cards that have a tag named "NeedsReview" (case-insensitive).
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

interface Tag {
  id: string
  name: string
  color: string
}

interface CardWithTags {
  id: string
  tags?: Tag[]
}

/**
 * Pure function to check if a card has NeedsReview tag.
 * This mirrors the logic in CardList.
 */
function hasNeedsReviewTag(card: CardWithTags): boolean {
  return card.tags?.some((t) => t.name.toLowerCase() === 'needsreview') ?? false
}

/**
 * Pure function to filter cards by NeedsReview.
 * This mirrors the filter logic in CardList.
 */
function filterByNeedsReview(cards: CardWithTags[]): CardWithTags[] {
  return cards.filter(hasNeedsReviewTag)
}

describe('V8.6: NeedsReview Filter', () => {
  // Tag arbitrary
  const tagArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 30 }),
    color: fc.constantFrom('purple', 'blue', 'green', 'red', 'yellow'),
  })

  // NeedsReview tag with various casings
  const needsReviewTagArb = fc.record({
    id: fc.uuid(),
    name: fc.constantFrom('NeedsReview', 'needsreview', 'NEEDSREVIEW', 'needsReview'),
    color: fc.constantFrom('purple', 'blue', 'green', 'red', 'yellow'),
  })

  // Card without NeedsReview tag
  const cardWithoutNeedsReviewArb = fc.record({
    id: fc.uuid(),
    tags: fc.array(tagArb, { maxLength: 5 }).filter(
      (tags) => !tags.some((t) => t.name.toLowerCase() === 'needsreview')
    ),
  })

  // Card with NeedsReview tag
  const cardWithNeedsReviewArb = fc.record({
    id: fc.uuid(),
    tags: fc.tuple(
      fc.array(tagArb, { maxLength: 4 }),
      needsReviewTagArb
    ).map(([otherTags, needsReviewTag]) => [...otherTags, needsReviewTag]),
  })

  /**
   * **Feature: v8.6-no-question-left-behind, Property 7: NeedsReview Filter**
   * **Validates: Requirements 4.3**
   */
  describe('Property 7: NeedsReview Filter', () => {
    it('filter returns only cards with NeedsReview tag', () => {
      fc.assert(
        fc.property(
          fc.array(cardWithoutNeedsReviewArb, { minLength: 0, maxLength: 10 }),
          fc.array(cardWithNeedsReviewArb, { minLength: 0, maxLength: 10 }),
          (cardsWithout, cardsWith) => {
            const allCards = [...cardsWithout, ...cardsWith]
            const filtered = filterByNeedsReview(allCards)

            // Filtered count should equal cards with NeedsReview
            expect(filtered.length).toBe(cardsWith.length)

            // All filtered cards should have NeedsReview tag
            for (const card of filtered) {
              expect(hasNeedsReviewTag(card)).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('filter returns exact subset - no cards without NeedsReview', () => {
      fc.assert(
        fc.property(
          fc.array(cardWithoutNeedsReviewArb, { minLength: 1, maxLength: 10 }),
          fc.array(cardWithNeedsReviewArb, { minLength: 1, maxLength: 10 }),
          (cardsWithout, cardsWith) => {
            const allCards = [...cardsWithout, ...cardsWith]
            const filtered = filterByNeedsReview(allCards)

            // No card without NeedsReview should be in filtered
            for (const card of cardsWithout) {
              expect(filtered.find((c) => c.id === card.id)).toBeUndefined()
            }

            // All cards with NeedsReview should be in filtered
            for (const card of cardsWith) {
              expect(filtered.find((c) => c.id === card.id)).toBeDefined()
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('filter on empty array returns empty array', () => {
      const filtered = filterByNeedsReview([])
      expect(filtered).toEqual([])
    })

    it('filter on array with no NeedsReview cards returns empty array', () => {
      fc.assert(
        fc.property(
          fc.array(cardWithoutNeedsReviewArb, { minLength: 1, maxLength: 10 }),
          (cards) => {
            const filtered = filterByNeedsReview(cards)
            expect(filtered.length).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('filter on array with all NeedsReview cards returns all cards', () => {
      fc.assert(
        fc.property(
          fc.array(cardWithNeedsReviewArb, { minLength: 1, maxLength: 10 }),
          (cards) => {
            const filtered = filterByNeedsReview(cards)
            expect(filtered.length).toBe(cards.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('filter preserves card order', () => {
      fc.assert(
        fc.property(
          fc.array(cardWithNeedsReviewArb, { minLength: 2, maxLength: 10 }),
          (cards) => {
            const filtered = filterByNeedsReview(cards)

            // Check order is preserved
            for (let i = 0; i < filtered.length; i++) {
              const originalIndex = cards.findIndex((c) => c.id === filtered[i].id)
              if (i > 0) {
                const prevOriginalIndex = cards.findIndex((c) => c.id === filtered[i - 1].id)
                expect(originalIndex).toBeGreaterThan(prevOriginalIndex)
              }
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('cards with undefined tags are not included', () => {
      const cardsWithUndefinedTags: CardWithTags[] = [
        { id: '1', tags: undefined },
        { id: '2', tags: [] },
        { id: '3' }, // No tags property
      ]

      const filtered = filterByNeedsReview(cardsWithUndefinedTags)
      expect(filtered.length).toBe(0)
    })
  })
})
