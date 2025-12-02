/**
 * V8.6: Resume Stats Preservation Property Tests
 * 
 * **Feature: v8.6-no-question-left-behind, Property 3: Resume Preserves Stats**
 * **Validates: Requirements 2.2**
 * 
 * For any saved auto-scan state with non-zero stats (cardsCreated, pagesProcessed, errorsCount),
 * calling resume() SHALL preserve those exact values in the hook's state.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'

import {
  loadAutoScanState,
  saveAutoScanState,
  type AutoScanState,
  type AutoScanStats,
} from '@/lib/auto-scan-storage'

describe('V8.6: Resume Preserves Stats', () => {
  // Mock localStorage
  let mockStorage: Record<string, string> = {}

  beforeEach(() => {
    mockStorage = {}

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key]
      }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // Arbitrary for non-zero stats
  const nonZeroStatsArb = fc.record({
    cardsCreated: fc.integer({ min: 1, max: 10000 }),
    pagesProcessed: fc.integer({ min: 1, max: 1000 }),
    errorsCount: fc.integer({ min: 0, max: 100 }),
  })

  /**
   * **Feature: v8.6-no-question-left-behind, Property 3: Resume Preserves Stats**
   * **Validates: Requirements 2.2**
   */
  describe('Property 3: Resume Preserves Stats', () => {
    it('non-zero cardsCreated is preserved after save/load', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          nonZeroStatsArb,
          (deckId, sourceId, stats) => {
            const state: AutoScanState = {
              isScanning: true,
              currentPage: stats.pagesProcessed + 1,
              totalPages: 100,
              stats,
              skippedPages: [],
              consecutiveErrors: 0,
              lastUpdated: Date.now(),
            }

            saveAutoScanState(deckId, sourceId, state)
            const loaded = loadAutoScanState(deckId, sourceId)

            expect(loaded?.stats.cardsCreated).toBe(stats.cardsCreated)
            expect(loaded?.stats.cardsCreated).toBeGreaterThan(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('non-zero pagesProcessed is preserved after save/load', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          nonZeroStatsArb,
          (deckId, sourceId, stats) => {
            const state: AutoScanState = {
              isScanning: true,
              currentPage: stats.pagesProcessed + 1,
              totalPages: 100,
              stats,
              skippedPages: [],
              consecutiveErrors: 0,
              lastUpdated: Date.now(),
            }

            saveAutoScanState(deckId, sourceId, state)
            const loaded = loadAutoScanState(deckId, sourceId)

            expect(loaded?.stats.pagesProcessed).toBe(stats.pagesProcessed)
            expect(loaded?.stats.pagesProcessed).toBeGreaterThan(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('errorsCount is preserved after save/load', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 50 }), // Non-zero errors
          (deckId, sourceId, errorsCount) => {
            const stats: AutoScanStats = {
              cardsCreated: 10,
              pagesProcessed: 5,
              errorsCount,
            }

            const state: AutoScanState = {
              isScanning: true,
              currentPage: 6,
              totalPages: 100,
              stats,
              skippedPages: [],
              consecutiveErrors: 0,
              lastUpdated: Date.now(),
            }

            saveAutoScanState(deckId, sourceId, state)
            const loaded = loadAutoScanState(deckId, sourceId)

            expect(loaded?.stats.errorsCount).toBe(errorsCount)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('all stats fields are preserved together', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          nonZeroStatsArb,
          (deckId, sourceId, stats) => {
            const state: AutoScanState = {
              isScanning: true,
              currentPage: 10,
              totalPages: 100,
              stats,
              skippedPages: [],
              consecutiveErrors: 0,
              lastUpdated: Date.now(),
            }

            saveAutoScanState(deckId, sourceId, state)
            const loaded = loadAutoScanState(deckId, sourceId)

            // All three stats should match exactly
            expect(loaded?.stats).toEqual(stats)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('skippedPages array is preserved with stats', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.array(
            fc.record({
              pageNumber: fc.integer({ min: 1, max: 100 }),
              reason: fc.string({ minLength: 1, maxLength: 50 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (deckId, sourceId, skippedPages) => {
            const state: AutoScanState = {
              isScanning: true,
              currentPage: 20,
              totalPages: 100,
              stats: {
                cardsCreated: 50,
                pagesProcessed: 19,
                errorsCount: skippedPages.length,
              },
              skippedPages,
              consecutiveErrors: 0,
              lastUpdated: Date.now(),
            }

            saveAutoScanState(deckId, sourceId, state)
            const loaded = loadAutoScanState(deckId, sourceId)

            expect(loaded?.skippedPages).toEqual(skippedPages)
            expect(loaded?.skippedPages.length).toBe(skippedPages.length)
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
