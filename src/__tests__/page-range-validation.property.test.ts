/**
 * V8.3: Page Range Validation Property Tests
 * 
 * **Feature: v8.3-precision-scanning, Property 4: Invalid Range Validation**
 * **Validates: Requirements 2.6**
 * 
 * For any page range where startPage > endPage OR startPage < 1 OR endPage > totalPages,
 * the validation function SHALL return an error message.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { validatePageRange } from '@/components/pdf/AutoScanControls'

describe('Property 4: Invalid Range Validation', () => {
  /**
   * **Feature: v8.3-precision-scanning, Property 4: Invalid Range Validation**
   * **Validates: Requirements 2.6**
   * 
   * For any valid range (1 <= startPage <= endPage <= totalPages),
   * validation should return null (no error).
   */
  it('returns null for valid page ranges', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }), // totalPages
        fc.integer({ min: 1, max: 1000 }), // startPage
        fc.integer({ min: 1, max: 1000 }), // endPage
        (totalPages, rawStart, rawEnd) => {
          // Constrain to valid range
          const startPage = Math.min(rawStart, totalPages)
          const endPage = Math.min(Math.max(rawEnd, startPage), totalPages)
          
          const result = validatePageRange(startPage, endPage, totalPages)
          expect(result).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: v8.3-precision-scanning, Property 4: Invalid Range Validation**
   * **Validates: Requirements 2.6**
   * 
   * For any startPage < 1, validation should return an error.
   */
  it('returns error when startPage < 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 0 }), // invalid startPage
        fc.integer({ min: 1, max: 100 }),  // endPage
        fc.integer({ min: 1, max: 100 }),  // totalPages
        (startPage, endPage, totalPages) => {
          const result = validatePageRange(startPage, endPage, totalPages)
          expect(result).not.toBeNull()
          expect(result).toContain('Start page must be at least 1')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: v8.3-precision-scanning, Property 4: Invalid Range Validation**
   * **Validates: Requirements 2.6**
   * 
   * For any endPage > totalPages, validation should return an error.
   */
  it('returns error when endPage > totalPages', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),   // startPage
        fc.integer({ min: 1, max: 100 }),   // totalPages
        fc.integer({ min: 1, max: 100 }),   // extra pages beyond total
        (startPage, totalPages, extra) => {
          const endPage = totalPages + extra // Always > totalPages
          const validStartPage = Math.min(startPage, totalPages)
          
          const result = validatePageRange(validStartPage, endPage, totalPages)
          expect(result).not.toBeNull()
          expect(result).toContain('End page cannot exceed')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: v8.3-precision-scanning, Property 4: Invalid Range Validation**
   * **Validates: Requirements 2.6**
   * 
   * For any startPage > endPage, validation should return an error.
   */
  it('returns error when startPage > endPage', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 100 }),  // startPage (at least 2 so we can have endPage < startPage)
        fc.integer({ min: 1, max: 100 }),  // totalPages
        (startPage, totalPages) => {
          // Ensure startPage is valid but endPage < startPage
          const validStartPage = Math.min(startPage, totalPages)
          if (validStartPage <= 1) return // Skip if we can't create invalid range
          
          const endPage = validStartPage - 1 // Always < startPage
          
          const result = validatePageRange(validStartPage, endPage, totalPages)
          expect(result).not.toBeNull()
          expect(result).toContain('Start page cannot be greater than end page')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: v8.3-precision-scanning, Property 4: Invalid Range Validation**
   * **Validates: Requirements 2.6**
   * 
   * Edge case: single page range (startPage === endPage) should be valid.
   */
  it('accepts single page range (startPage === endPage)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // page number
        fc.integer({ min: 1, max: 100 }), // totalPages
        (page, totalPages) => {
          const validPage = Math.min(page, totalPages)
          
          const result = validatePageRange(validPage, validPage, totalPages)
          expect(result).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: v8.3-precision-scanning, Property 4: Invalid Range Validation**
   * **Validates: Requirements 2.6**
   * 
   * Edge case: full document range should be valid.
   */
  it('accepts full document range (1 to totalPages)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }), // totalPages
        (totalPages) => {
          const result = validatePageRange(1, totalPages, totalPages)
          expect(result).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })
})
