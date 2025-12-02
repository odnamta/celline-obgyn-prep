/**
 * V8.6: Resume Page Position Property Tests
 * 
 * **Feature: v8.6-no-question-left-behind, Property 2: Resume Preserves Page Position**
 * **Validates: Requirements 2.1**
 * 
 * For any saved auto-scan state where currentPage > 1, calling resume()
 * SHALL result in scanning starting from exactly currentPage, never from page 1.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'

import {
  loadAutoScanState,
  saveAutoScanState,
  clearAutoScanState,
  type AutoScanState,
} from '@/lib/auto-scan-storage'

describe('V8.6: Resume Preserves Page Position', () => {
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

  /**
   * **Feature: v8.6-no-question-left-behind, Property 2: Resume Preserves Page Position**
   * **Validates: Requirements 2.1**
   */
  describe('Property 2: Resume Preserves Page Position', () => {
    it('saved state with currentPage > 1 is loaded with exact page number', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 2, max: 500 }), // currentPage > 1
          fc.integer({ min: 1, max: 500 }),
          (deckId, sourceId, currentPage, totalPagesBase) => {
            const totalPages = Math.max(currentPage, totalPagesBase)

            const state: AutoScanState = {
              isScanning: true,
              currentPage,
              totalPages,
              stats: { cardsCreated: 10, pagesProcessed: currentPage - 1, errorsCount: 0 },
              skippedPages: [],
              consecutiveErrors: 0,
              lastUpdated: Date.now(),
            }

            saveAutoScanState(deckId, sourceId, state)

            const loaded = loadAutoScanState(deckId, sourceId)

            // The loaded state should have the exact currentPage, never reset to 1
            expect(loaded).not.toBeNull()
            expect(loaded?.currentPage).toBe(currentPage)
            expect(loaded?.currentPage).toBeGreaterThan(1)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('page position is preserved across save/load cycle', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 1000 }),
          (deckId, sourceId, currentPage) => {
            const state: AutoScanState = {
              isScanning: true,
              currentPage,
              totalPages: Math.max(currentPage, 100),
              stats: { cardsCreated: 0, pagesProcessed: 0, errorsCount: 0 },
              skippedPages: [],
              consecutiveErrors: 0,
              lastUpdated: Date.now(),
            }

            saveAutoScanState(deckId, sourceId, state)
            const loaded = loadAutoScanState(deckId, sourceId)

            // Round-trip should preserve exact page number
            expect(loaded?.currentPage).toBe(currentPage)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('multiple save/load cycles preserve page position', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.array(fc.integer({ min: 1, max: 500 }), { minLength: 2, maxLength: 10 }),
          (deckId, sourceId, pageSequence) => {
            // Simulate multiple page advances
            for (const page of pageSequence) {
              const state: AutoScanState = {
                isScanning: true,
                currentPage: page,
                totalPages: 500,
                stats: { cardsCreated: page * 2, pagesProcessed: page - 1, errorsCount: 0 },
                skippedPages: [],
                consecutiveErrors: 0,
                lastUpdated: Date.now(),
              }

              saveAutoScanState(deckId, sourceId, state)
            }

            // Final load should have the last page in sequence
            const loaded = loadAutoScanState(deckId, sourceId)
            expect(loaded?.currentPage).toBe(pageSequence[pageSequence.length - 1])
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
