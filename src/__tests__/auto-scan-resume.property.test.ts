/**
 * V8.4: Auto-Scan Resume State Property Tests
 * 
 * Tests for the Resume State Persistence fixes in V8.4 Auto-Scan Polish.
 * These tests verify that scan progress is properly saved and restored.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'

import {
  loadAutoScanState,
  saveAutoScanState,
  clearAutoScanState,
  type AutoScanState,
  type AutoScanStats,
} from '@/lib/auto-scan-storage'

describe('V8.4: Auto-Scan Resume State Properties', () => {
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

  // Arbitrary generators for AutoScanState
  const statsArb = fc.record({
    cardsCreated: fc.integer({ min: 0, max: 10000 }),
    pagesProcessed: fc.integer({ min: 0, max: 1000 }),
    errorsCount: fc.integer({ min: 0, max: 100 }),
  })

  const skippedPageArb = fc.record({
    pageNumber: fc.integer({ min: 1, max: 1000 }),
    reason: fc.string({ minLength: 1, maxLength: 100 }),
  })

  const autoScanStateArb = fc.record({
    isScanning: fc.boolean(),
    currentPage: fc.integer({ min: 1, max: 1000 }),
    totalPages: fc.integer({ min: 1, max: 1000 }),
    stats: statsArb,
    skippedPages: fc.array(skippedPageArb, { maxLength: 50 }),
    consecutiveErrors: fc.integer({ min: 0, max: 10 }),
    lastUpdated: fc.integer({ min: 0 }),
  })

  /**
   * **Feature: v8.4-auto-scan-polish, Property 2: Pause triggers immediate persist**
   * **Validates: Requirements 1.2**
   * 
   * For any scan state, calling saveAutoScanState SHALL result in localStorage
   * containing the current state.
   */
  describe('Property 2: Pause triggers immediate persist', () => {
    it('saveAutoScanState persists state to localStorage immediately', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          autoScanStateArb,
          (deckId, sourceId, state) => {
            // Save state
            saveAutoScanState(deckId, sourceId, state)
            
            // Verify it was persisted
            const key = `autoscan_state_${deckId}_${sourceId}`
            expect(mockStorage[key]).toBeDefined()
            
            // Verify the persisted state matches
            const loaded = loadAutoScanState(deckId, sourceId)
            expect(loaded).toEqual(state)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('saveAutoScanState with isScanning=false is persisted correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          autoScanStateArb,
          (deckId, sourceId, state) => {
            // Simulate pause: set isScanning to false
            const pausedState = { ...state, isScanning: false }
            
            saveAutoScanState(deckId, sourceId, pausedState)
            
            const loaded = loadAutoScanState(deckId, sourceId)
            expect(loaded?.isScanning).toBe(false)
            expect(loaded?.currentPage).toBe(pausedState.currentPage)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: v8.4-auto-scan-polish, Property 3: Resumable state detection**
   * **Validates: Requirements 1.3**
   * 
   * For any valid saved state with isScanning=true, loading that state
   * SHALL return a non-null state that can be used for resume.
   */
  describe('Property 3: Resumable state detection', () => {
    it('loadAutoScanState returns state when isScanning=true was saved', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          autoScanStateArb,
          (deckId, sourceId, state) => {
            // Save state with isScanning=true
            const scanningState = { ...state, isScanning: true }
            saveAutoScanState(deckId, sourceId, scanningState)
            
            // Load should return the state
            const loaded = loadAutoScanState(deckId, sourceId)
            expect(loaded).not.toBeNull()
            expect(loaded?.isScanning).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('loaded state contains correct currentPage for resume', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 500 }),
          fc.integer({ min: 1, max: 500 }),
          (deckId, sourceId, currentPage, totalPages) => {
            const state: AutoScanState = {
              isScanning: true,
              currentPage,
              totalPages: Math.max(currentPage, totalPages),
              stats: { cardsCreated: 0, pagesProcessed: 0, errorsCount: 0 },
              skippedPages: [],
              consecutiveErrors: 0,
              lastUpdated: Date.now(),
            }
            
            saveAutoScanState(deckId, sourceId, state)
            
            const loaded = loadAutoScanState(deckId, sourceId)
            expect(loaded?.currentPage).toBe(currentPage)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: v8.4-auto-scan-polish, Property 4: Resume preserves stats**
   * **Validates: Requirements 1.4**
   * 
   * For any saved scan state, loading that state SHALL preserve the stats
   * (cardsCreated, pagesProcessed, errorsCount) from the saved state.
   */
  describe('Property 4: Resume preserves stats', () => {
    it('loaded state preserves all stats fields', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          statsArb,
          (deckId, sourceId, stats) => {
            const state: AutoScanState = {
              isScanning: true,
              currentPage: 5,
              totalPages: 100,
              stats,
              skippedPages: [],
              consecutiveErrors: 0,
              lastUpdated: Date.now(),
            }
            
            saveAutoScanState(deckId, sourceId, state)
            
            const loaded = loadAutoScanState(deckId, sourceId)
            expect(loaded?.stats.cardsCreated).toBe(stats.cardsCreated)
            expect(loaded?.stats.pagesProcessed).toBe(stats.pagesProcessed)
            expect(loaded?.stats.errorsCount).toBe(stats.errorsCount)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('loaded state preserves skippedPages array', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.array(skippedPageArb, { minLength: 1, maxLength: 10 }),
          (deckId, sourceId, skippedPages) => {
            const state: AutoScanState = {
              isScanning: true,
              currentPage: 10,
              totalPages: 100,
              stats: { cardsCreated: 5, pagesProcessed: 9, errorsCount: 1 },
              skippedPages,
              consecutiveErrors: 0,
              lastUpdated: Date.now(),
            }
            
            saveAutoScanState(deckId, sourceId, state)
            
            const loaded = loadAutoScanState(deckId, sourceId)
            expect(loaded?.skippedPages).toEqual(skippedPages)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: v8.4-auto-scan-polish, Property 5: Corruption recovery**
   * **Validates: Requirements 1.5**
   * 
   * For any corrupted or invalid JSON in localStorage, loadAutoScanState
   * SHALL return null and clear the corrupted entry.
   */
  describe('Property 5: Corruption recovery', () => {
    it('returns null for corrupted JSON', () => {
      const corruptedStrings = [
        '{invalid json',
        '{"partial": ',
        'not json',
        '[]',
        'null',
        '123',
      ]
      
      for (const corrupted of corruptedStrings) {
        const deckId = 'test-deck'
        const sourceId = 'test-source'
        const key = `autoscan_state_${deckId}_${sourceId}`
        
        mockStorage[key] = corrupted
        
        const result = loadAutoScanState(deckId, sourceId)
        expect(result).toBeNull()
      }
    })
    
    it('clears corrupted entry from localStorage', () => {
      const deckId = 'test-deck'
      const sourceId = 'test-source'
      const key = `autoscan_state_${deckId}_${sourceId}`
      
      mockStorage[key] = '{corrupted'
      
      loadAutoScanState(deckId, sourceId)
      
      // Verify removeItem was called (entry should be deleted)
      expect(mockStorage[key]).toBeUndefined()
    })

    it('returns null for objects with wrong shape', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.record({
            // Missing required fields
            someField: fc.string(),
            anotherField: fc.integer(),
          }),
          (deckId, sourceId, wrongShape) => {
            const key = `autoscan_state_${deckId}_${sourceId}`
            mockStorage[key] = JSON.stringify(wrongShape)
            
            const result = loadAutoScanState(deckId, sourceId)
            expect(result).toBeNull()
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * Storage key isolation test
   * Verifies that state doesn't leak between different deck/source combinations.
   */
  describe('Storage key isolation', () => {
    it('different deckId/sourceId combinations have isolated state', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (deckId1, sourceId1, deckId2, sourceId2) => {
            // Skip if same combination
            if (deckId1 === deckId2 && sourceId1 === sourceId2) return
            
            const state1: AutoScanState = {
              isScanning: true,
              currentPage: 10,
              totalPages: 100,
              stats: { cardsCreated: 50, pagesProcessed: 9, errorsCount: 0 },
              skippedPages: [],
              consecutiveErrors: 0,
              lastUpdated: Date.now(),
            }
            
            const state2: AutoScanState = {
              isScanning: false,
              currentPage: 5,
              totalPages: 50,
              stats: { cardsCreated: 20, pagesProcessed: 4, errorsCount: 1 },
              skippedPages: [{ pageNumber: 3, reason: 'error' }],
              consecutiveErrors: 1,
              lastUpdated: Date.now(),
            }
            
            saveAutoScanState(deckId1, sourceId1, state1)
            saveAutoScanState(deckId2, sourceId2, state2)
            
            const loaded1 = loadAutoScanState(deckId1, sourceId1)
            const loaded2 = loadAutoScanState(deckId2, sourceId2)
            
            expect(loaded1?.currentPage).toBe(10)
            expect(loaded2?.currentPage).toBe(5)
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
