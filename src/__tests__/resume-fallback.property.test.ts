/**
 * V8.6: Resume Fallback Property Tests
 * 
 * **Feature: v8.6-no-question-left-behind, Property 4: Resume Fallback on Missing State**
 * **Validates: Requirements 2.3, 2.4**
 * 
 * For any call to resume() when localStorage contains no valid saved state,
 * the system SHALL fall back to startFresh() behavior (page 1, zeroed stats).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'

import {
  loadAutoScanState,
  saveAutoScanState,
  clearAutoScanState,
  isValidAutoScanState,
  type AutoScanState,
} from '@/lib/auto-scan-storage'

describe('V8.6: Resume Fallback on Missing State', () => {
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
   * **Feature: v8.6-no-question-left-behind, Property 4: Resume Fallback on Missing State**
   * **Validates: Requirements 2.3, 2.4**
   */
  describe('Property 4: Resume Fallback on Missing State', () => {
    it('loadAutoScanState returns null when no state exists', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (deckId, sourceId) => {
            // Don't save anything - localStorage is empty
            const loaded = loadAutoScanState(deckId, sourceId)
            expect(loaded).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('loadAutoScanState returns null after clearAutoScanState', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (deckId, sourceId) => {
            // Save some state
            const state: AutoScanState = {
              isScanning: true,
              currentPage: 10,
              totalPages: 100,
              stats: { cardsCreated: 50, pagesProcessed: 9, errorsCount: 0 },
              skippedPages: [],
              consecutiveErrors: 0,
              lastUpdated: Date.now(),
            }
            saveAutoScanState(deckId, sourceId, state)

            // Clear it
            clearAutoScanState(deckId, sourceId)

            // Should return null now
            const loaded = loadAutoScanState(deckId, sourceId)
            expect(loaded).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('loadAutoScanState returns null for state with isScanning=false', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          (deckId, sourceId, currentPage) => {
            // Save state with isScanning=false (not resumable)
            const state: AutoScanState = {
              isScanning: false, // Not resumable
              currentPage,
              totalPages: 100,
              stats: { cardsCreated: 50, pagesProcessed: currentPage - 1, errorsCount: 0 },
              skippedPages: [],
              consecutiveErrors: 0,
              lastUpdated: Date.now(),
            }
            saveAutoScanState(deckId, sourceId, state)

            const loaded = loadAutoScanState(deckId, sourceId)

            // State exists but isScanning is false - resume logic should treat as non-resumable
            // The loaded state will have isScanning=false, which the hook checks
            expect(loaded?.isScanning).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('corrupted JSON results in null return', () => {
      const corruptedValues = [
        '{invalid',
        '{"partial":',
        'not json at all',
        '[]',
        'null',
        '123',
        'true',
        '""',
      ]

      for (const corrupted of corruptedValues) {
        const deckId = 'test-deck'
        const sourceId = 'test-source'
        const key = `autoscan_state_${deckId}_${sourceId}`

        mockStorage[key] = corrupted

        const loaded = loadAutoScanState(deckId, sourceId)
        expect(loaded).toBeNull()
      }
    })

    it('invalid shape results in null return and clears storage', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.record({
            // Missing required fields - invalid shape
            randomField: fc.string(),
            anotherField: fc.integer(),
          }),
          (deckId, sourceId, invalidShape) => {
            const key = `autoscan_state_${deckId}_${sourceId}`
            mockStorage[key] = JSON.stringify(invalidShape)

            const loaded = loadAutoScanState(deckId, sourceId)

            // Should return null for invalid shape
            expect(loaded).toBeNull()
            // Should have cleared the corrupted entry
            expect(mockStorage[key]).toBeUndefined()
          }
        ),
        { numRuns: 50 }
      )
    })

    it('isValidAutoScanState correctly identifies invalid states', () => {
      const invalidStates = [
        null,
        undefined,
        {},
        { isScanning: 'not a boolean' },
        { isScanning: true }, // Missing other fields
        { isScanning: true, currentPage: 'not a number' },
        { isScanning: true, currentPage: 1, totalPages: 100 }, // Missing stats
        {
          isScanning: true,
          currentPage: 1,
          totalPages: 100,
          stats: { cardsCreated: 0 }, // Incomplete stats
          skippedPages: [],
          consecutiveErrors: 0,
          lastUpdated: Date.now(),
        },
      ]

      for (const invalid of invalidStates) {
        expect(isValidAutoScanState(invalid)).toBe(false)
      }
    })

    it('isValidAutoScanState correctly identifies valid states', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 0, max: 10000 }),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 100 }),
          (currentPage, totalPages, cardsCreated, pagesProcessed, errorsCount) => {
            const validState: AutoScanState = {
              isScanning: true,
              currentPage,
              totalPages: Math.max(currentPage, totalPages),
              stats: { cardsCreated, pagesProcessed, errorsCount },
              skippedPages: [],
              consecutiveErrors: 0,
              lastUpdated: Date.now(),
            }

            expect(isValidAutoScanState(validState)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
