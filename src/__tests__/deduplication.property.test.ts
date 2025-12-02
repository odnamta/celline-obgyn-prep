/**
 * V8.3: Deduplication Correctness Property Tests
 * 
 * **Feature: v8.3-precision-scanning, Property 5: Deduplication Correctness**
 * **Validates: Requirements 3.1, 3.2**
 * 
 * For any deck containing cards with duplicate normalized stems, after deduplication:
 * - Each unique normalized stem SHALL have exactly one card remaining
 * - The surviving card SHALL be the one with the earliest created_at timestamp
 * - The returned deletedCount SHALL equal the total number of cards removed
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { normalizeStem, identifyDuplicates } from '@/lib/deduplication'

// Card type for testing
interface TestCard {
  id: string
  stem: string | null
  created_at: string
}

// Generate a random ISO date string
const dateArb = fc.integer({ min: 1577836800000, max: 1767225600000 }) // 2020-01-01 to 2025-12-31
  .map(ts => new Date(ts).toISOString())



describe('Property 5: Deduplication Correctness', () => {
  describe('normalizeStem', () => {
    /**
     * **Feature: v8.3-precision-scanning, Property 5: Deduplication Correctness**
     * **Validates: Requirements 3.1**
     * 
     * Normalization should be case-insensitive.
     */
    it('converts to lowercase', () => {
      fc.assert(
        fc.property(fc.string(), (stem) => {
          const normalized = normalizeStem(stem)
          expect(normalized).toBe(normalized.toLowerCase())
        }),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: v8.3-precision-scanning, Property 5: Deduplication Correctness**
     * **Validates: Requirements 3.1**
     * 
     * Normalization should trim whitespace.
     */
    it('trims whitespace', () => {
      fc.assert(
        fc.property(fc.string(), (stem) => {
          const normalized = normalizeStem(stem)
          expect(normalized).toBe(normalized.trim())
        }),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: v8.3-precision-scanning, Property 5: Deduplication Correctness**
     * **Validates: Requirements 3.1**
     * 
     * Null stems should normalize to empty string.
     */
    it('handles null stems', () => {
      expect(normalizeStem(null)).toBe('')
    })
  })

  describe('identifyDuplicates', () => {
    /**
     * **Feature: v8.3-precision-scanning, Property 5: Deduplication Correctness**
     * **Validates: Requirements 3.1, 3.2**
     * 
     * For any set of cards with unique stems, no cards should be marked for deletion.
     */
    it('returns empty array when all stems are unique', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 20 }),
          (stems) => {
            // Make stems unique
            const uniqueStems = [...new Set(stems.map(s => s.toLowerCase().trim()))]
            
            const cards: TestCard[] = uniqueStems.map((stem, i) => ({
              id: `card-${i}`,
              stem,
              created_at: new Date(2024, 0, i + 1).toISOString(),
            }))
            
            const toDelete = identifyDuplicates(cards)
            expect(toDelete).toEqual([])
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: v8.3-precision-scanning, Property 5: Deduplication Correctness**
     * **Validates: Requirements 3.2**
     * 
     * For any group of cards with the same stem, only the oldest should survive.
     */
    it('keeps oldest card per duplicate stem', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),  // stem
          fc.integer({ min: 2, max: 10 }), // number of duplicates
          (stem, count) => {
            // Create cards with same stem but different dates
            const cards: TestCard[] = Array.from({ length: count }, (_, i) => ({
              id: `card-${i}`,
              stem,
              created_at: new Date(2024, 0, i + 1).toISOString(), // card-0 is oldest
            }))
            
            const toDelete = identifyDuplicates(cards)
            
            // Should delete all except the oldest (card-0)
            expect(toDelete.length).toBe(count - 1)
            expect(toDelete).not.toContain('card-0')
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: v8.3-precision-scanning, Property 5: Deduplication Correctness**
     * **Validates: Requirements 3.1, 3.2**
     * 
     * After deduplication, each unique normalized stem should have exactly one card.
     */
    it('leaves exactly one card per unique stem', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }), // stems (may have duplicates)
          fc.array(dateArb, { minLength: 1, maxLength: 10 }),
          (stems, dates) => {
            // Create cards with potentially duplicate stems
            const cards: TestCard[] = stems.map((stem, i) => ({
              id: `card-${i}`,
              stem,
              created_at: dates[i % dates.length],
            }))
            
            const toDelete = identifyDuplicates(cards)
            const toDeleteSet = new Set(toDelete)
            
            // Get surviving cards
            const surviving = cards.filter(c => !toDeleteSet.has(c.id))
            
            // Count unique stems in surviving cards
            const survivingStems = new Set(surviving.map(c => normalizeStem(c.stem)))
            
            // Each surviving stem should appear exactly once
            expect(surviving.length).toBe(survivingStems.size)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: v8.3-precision-scanning, Property 5: Deduplication Correctness**
     * **Validates: Requirements 3.2**
     * 
     * The deletedCount should equal the number of cards removed.
     */
    it('deletedCount equals cards removed', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 20 }),
          (stems) => {
            const cards: TestCard[] = stems.map((stem, i) => ({
              id: `card-${i}`,
              stem,
              created_at: new Date(2024, 0, i + 1).toISOString(),
            }))
            
            const toDelete = identifyDuplicates(cards)
            const originalCount = cards.length
            const survivingCount = originalCount - toDelete.length
            
            // Count unique normalized stems
            const uniqueStems = new Set(
              cards.map(c => normalizeStem(c.stem)).filter(s => s !== '')
            )
            
            // Surviving count should equal unique stems (plus any empty stems)
            const emptyStems = cards.filter(c => normalizeStem(c.stem) === '').length
            expect(survivingCount).toBe(uniqueStems.size + emptyStems)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: v8.3-precision-scanning, Property 5: Deduplication Correctness**
     * **Validates: Requirements 3.1**
     * 
     * Case differences should be treated as duplicates.
     */
    it('treats case-different stems as duplicates', () => {
      const cards: TestCard[] = [
        { id: 'card-1', stem: 'What is X?', created_at: '2024-01-01T00:00:00Z' },
        { id: 'card-2', stem: 'WHAT IS X?', created_at: '2024-01-02T00:00:00Z' },
        { id: 'card-3', stem: 'what is x?', created_at: '2024-01-03T00:00:00Z' },
      ]
      
      const toDelete = identifyDuplicates(cards)
      
      // Should delete 2 cards, keeping the oldest (card-1)
      expect(toDelete.length).toBe(2)
      expect(toDelete).not.toContain('card-1')
      expect(toDelete).toContain('card-2')
      expect(toDelete).toContain('card-3')
    })

    /**
     * **Feature: v8.3-precision-scanning, Property 5: Deduplication Correctness**
     * **Validates: Requirements 3.1**
     * 
     * Whitespace differences should be treated as duplicates.
     */
    it('treats whitespace-different stems as duplicates', () => {
      const cards: TestCard[] = [
        { id: 'card-1', stem: '  What is X?  ', created_at: '2024-01-01T00:00:00Z' },
        { id: 'card-2', stem: 'What is X?', created_at: '2024-01-02T00:00:00Z' },
      ]
      
      const toDelete = identifyDuplicates(cards)
      
      // Should delete 1 card, keeping the oldest (card-1)
      expect(toDelete.length).toBe(1)
      expect(toDelete).not.toContain('card-1')
      expect(toDelete).toContain('card-2')
    })

    /**
     * **Feature: v8.3-precision-scanning, Property 5: Deduplication Correctness**
     * **Validates: Requirements 3.5**
     * 
     * Empty deck should return empty array.
     */
    it('returns empty array for empty deck', () => {
      const toDelete = identifyDuplicates([])
      expect(toDelete).toEqual([])
    })
  })
})
