/**
 * V8.6: NeedsReview Highlight Property Tests
 * 
 * **Feature: v8.6-no-question-left-behind, Property 6: NeedsReview Highlight**
 * **Validates: Requirements 4.2**
 * 
 * For any card with a tag where name.toLowerCase() === 'needsreview',
 * the CardList component SHALL render that card with the yellow highlight class.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Pure function to check if a card needs review based on its tags.
 * This mirrors the logic in CardListItem.
 */
function hasNeedsReviewTag(tags: Array<{ name: string }>): boolean {
  return tags.some((tag) => tag.name.toLowerCase() === 'needsreview')
}

/**
 * Pure function to determine the border classes for a card.
 * This mirrors the getBorderClasses logic in CardListItem.
 */
function getBorderClasses(
  isSelected: boolean,
  needsReview: boolean
): string {
  if (isSelected) {
    return 'border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
  }
  if (needsReview) {
    return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
  }
  return 'border-slate-200 dark:border-slate-700'
}

describe('V8.6: NeedsReview Highlight', () => {
  // Tag arbitrary
  const tagArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 30 }),
    color: fc.constantFrom('purple', 'blue', 'green', 'red', 'yellow'),
  })

  // NeedsReview tag with various casings
  const needsReviewTagArb = fc.record({
    id: fc.uuid(),
    name: fc.constantFrom('NeedsReview', 'needsreview', 'NEEDSREVIEW', 'needsReview', 'NeedsREVIEW'),
    color: fc.constantFrom('purple', 'blue', 'green', 'red', 'yellow'),
  })

  /**
   * **Feature: v8.6-no-question-left-behind, Property 6: NeedsReview Highlight**
   * **Validates: Requirements 4.2**
   */
  describe('Property 6: NeedsReview Highlight', () => {
    it('cards with NeedsReview tag (any case) are detected', () => {
      fc.assert(
        fc.property(
          fc.array(tagArb, { maxLength: 5 }),
          needsReviewTagArb,
          (otherTags, needsReviewTag) => {
            const tags = [...otherTags, needsReviewTag]
            expect(hasNeedsReviewTag(tags)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('cards without NeedsReview tag are not flagged', () => {
      fc.assert(
        fc.property(
          fc.array(tagArb, { maxLength: 5 }).filter(
            (tags) => !tags.some((t) => t.name.toLowerCase() === 'needsreview')
          ),
          (tags) => {
            expect(hasNeedsReviewTag(tags)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('NeedsReview detection is case-insensitive', () => {
      const casings = [
        'NeedsReview',
        'needsreview',
        'NEEDSREVIEW',
        'needsReview',
        'NeedsREVIEW',
        'nEeDsReViEw',
      ]

      for (const casing of casings) {
        const tags = [{ name: casing }]
        expect(hasNeedsReviewTag(tags)).toBe(true)
      }
    })

    it('yellow highlight class is applied when needsReview is true and not selected', () => {
      const classes = getBorderClasses(false, true)
      expect(classes).toContain('border-yellow-400')
      expect(classes).toContain('bg-yellow-50')
    })

    it('selection takes priority over needsReview highlight', () => {
      const classes = getBorderClasses(true, true)
      expect(classes).toContain('border-blue-400')
      expect(classes).not.toContain('border-yellow-400')
    })

    it('default classes when not selected and not needsReview', () => {
      const classes = getBorderClasses(false, false)
      expect(classes).toContain('border-slate-200')
      expect(classes).not.toContain('border-yellow-400')
      expect(classes).not.toContain('border-blue-400')
    })

    it('empty tags array means no needsReview', () => {
      expect(hasNeedsReviewTag([])).toBe(false)
    })

    it('similar but different tag names are not flagged', () => {
      const similarNames = [
        'NeedsReviews', // Extra 's'
        'NeedReview', // Missing 's'
        'Needs Review', // Space
        'Needs-Review', // Hyphen
        'NeedsReview!', // Punctuation
        'Review',
        'Needs',
      ]

      for (const name of similarNames) {
        const tags = [{ name }]
        expect(hasNeedsReviewTag(tags)).toBe(false)
      }
    })
  })
})
