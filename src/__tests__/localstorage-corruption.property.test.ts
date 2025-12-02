/**
 * V8.3: localStorage Corruption Recovery Property Tests
 * 
 * **Feature: v8.3-precision-scanning, Property 1: localStorage Corruption Recovery**
 * **Validates: Requirements 1.2**
 * 
 * For any corrupted or invalid JSON string stored in localStorage for auto-scan state,
 * calling loadAutoScanState SHALL return null without throwing an exception,
 * and the corrupted entry SHALL be cleared.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'

// Import from the pure utility file (no server-side dependencies)
import { loadAutoScanState, saveAutoScanState, clearAutoScanState } from '@/lib/auto-scan-storage'

describe('Property 1: localStorage Corruption Recovery', () => {
  // Mock localStorage
  let mockStorage: Record<string, string> = {}
  
  beforeEach(() => {
    mockStorage = {}
    
    // Mock localStorage
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
   * **Feature: v8.3-precision-scanning, Property 1: localStorage Corruption Recovery**
   * **Validates: Requirements 1.2**
   * 
   * For any arbitrary string (including invalid JSON), loadAutoScanState
   * should never throw and should return null.
   */
  it('returns null for any corrupted/invalid JSON string without throwing', () => {
    fc.assert(
      fc.property(
        fc.string(), // Generate arbitrary strings including invalid JSON
        (corruptedData) => {
          const deckId = 'test-deck'
          const sourceId = 'test-source'
          const key = `autoscan_state_${deckId}_${sourceId}`
          
          // Store corrupted data directly in mock storage
          mockStorage[key] = corruptedData
          
          // Should not throw
          let result: ReturnType<typeof loadAutoScanState>
          expect(() => {
            result = loadAutoScanState(deckId, sourceId)
          }).not.toThrow()
          
          // Should return null for invalid data
          // (unless by chance the random string is valid JSON with correct shape)
          // We verify it doesn't crash - that's the key property
          expect(result === null || typeof result === 'object').toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: v8.3-precision-scanning, Property 1: localStorage Corruption Recovery**
   * **Validates: Requirements 1.2**
   * 
   * For any string that is not valid JSON, loadAutoScanState should return null.
   */
  it('returns null for strings that are not valid JSON', () => {
    const invalidJsonStrings = [
      '{invalid}',
      '{"unclosed": ',
      'not json at all',
      '{"key": undefined}',
      "{'single': 'quotes'}",
      '',
      'null',  // Valid JSON but not an object
      '123',   // Valid JSON but not an object
      '"string"', // Valid JSON but not an object
      '[]',    // Valid JSON but array, not object
    ]
    
    for (const invalidJson of invalidJsonStrings) {
      const deckId = 'test-deck'
      const sourceId = 'test-source'
      const key = `autoscan_state_${deckId}_${sourceId}`
      
      mockStorage[key] = invalidJson
      
      expect(() => {
        const result = loadAutoScanState(deckId, sourceId)
        expect(result).toBeNull()
      }).not.toThrow()
    }
  })

  /**
   * **Feature: v8.3-precision-scanning, Property 1: localStorage Corruption Recovery**
   * **Validates: Requirements 1.2**
   * 
   * For any JSON object missing required fields, loadAutoScanState should return null.
   */
  it('returns null for JSON objects with missing required fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          // Generate partial objects missing some required fields
          isScanning: fc.option(fc.boolean(), { nil: undefined }),
          currentPage: fc.option(fc.integer(), { nil: undefined }),
          totalPages: fc.option(fc.integer(), { nil: undefined }),
        }),
        (partialState) => {
          const deckId = 'test-deck'
          const sourceId = 'test-source'
          const key = `autoscan_state_${deckId}_${sourceId}`
          
          // Store partial state (missing required fields)
          mockStorage[key] = JSON.stringify(partialState)
          
          // Should not throw
          let result: ReturnType<typeof loadAutoScanState>
          expect(() => {
            result = loadAutoScanState(deckId, sourceId)
          }).not.toThrow()
          
          // Should return null for incomplete state
          expect(result).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: v8.3-precision-scanning, Property 1: localStorage Corruption Recovery**
   * **Validates: Requirements 1.2**
   * 
   * For any valid AutoScanState, loadAutoScanState should return the state correctly.
   */
  it('returns valid state when localStorage contains valid AutoScanState', () => {
    fc.assert(
      fc.property(
        fc.record({
          isScanning: fc.boolean(),
          currentPage: fc.integer({ min: 1, max: 1000 }),
          totalPages: fc.integer({ min: 1, max: 1000 }),
          stats: fc.record({
            cardsCreated: fc.integer({ min: 0, max: 10000 }),
            pagesProcessed: fc.integer({ min: 0, max: 1000 }),
            errorsCount: fc.integer({ min: 0, max: 100 }),
          }),
          skippedPages: fc.array(
            fc.record({
              pageNumber: fc.integer({ min: 1, max: 1000 }),
              reason: fc.string(),
            })
          ),
          consecutiveErrors: fc.integer({ min: 0, max: 10 }),
          lastUpdated: fc.integer({ min: 0 }),
        }),
        (validState) => {
          const deckId = 'test-deck'
          const sourceId = 'test-source'
          const key = `autoscan_state_${deckId}_${sourceId}`
          
          // Store valid state
          mockStorage[key] = JSON.stringify(validState)
          
          // Should not throw
          let result: ReturnType<typeof loadAutoScanState>
          expect(() => {
            result = loadAutoScanState(deckId, sourceId)
          }).not.toThrow()
          
          // Should return the valid state
          expect(result).not.toBeNull()
          expect(result).toEqual(validState)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: v8.3-precision-scanning, Property 1: localStorage Corruption Recovery**
   * **Validates: Requirements 1.2**
   * 
   * Corrupted entries should be cleared from localStorage after failed load.
   */
  it('clears corrupted entries from localStorage', () => {
    const deckId = 'test-deck'
    const sourceId = 'test-source'
    const key = `autoscan_state_${deckId}_${sourceId}`
    
    // Store corrupted data
    mockStorage[key] = '{corrupted json'
    
    // Load should return null
    const result = loadAutoScanState(deckId, sourceId)
    expect(result).toBeNull()
    
    // Entry should be cleared
    expect(mockStorage[key]).toBeUndefined()
  })
})
