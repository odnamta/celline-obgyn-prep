import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { mcqBatchItemSchema, mcqBatchDraftSchema, type MCQBatchItem } from '@/lib/batch-mcq-schema'

/**
 * Property tests for V8.6 Unlimited Batch Extraction
 * 
 * **Feature: v8.6-no-question-left-behind, Property 1: No Artificial Array Cap**
 * **Validates: Requirements 1.1, 1.2, 1.4**
 * 
 * For any array of valid MCQ objects returned by the AI, the validation pipeline
 * SHALL process all items without truncation. The output count SHALL equal the
 * input count (minus any items that fail individual validation).
 */

// Arbitrary for valid MCQ batch item (matches schema requirements)
const validMCQBatchItemArb = fc.record({
  stem: fc.string({ minLength: 10, maxLength: 500 }),
  options: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 2, maxLength: 5 }),
  correctIndex: fc.integer({ min: 0, max: 4 }),
  explanation: fc.option(fc.string({ minLength: 1, maxLength: 1000 }), { nil: undefined }),
  tags: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 3 }),
})

// Arbitrary for invalid MCQ item (stem too short - will fail validation)
const invalidMCQBatchItemArb = fc.record({
  stem: fc.string({ minLength: 0, maxLength: 9 }), // Too short
  options: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 2, maxLength: 5 }),
  correctIndex: fc.integer({ min: 0, max: 4 }),
  explanation: fc.option(fc.string({ minLength: 1, maxLength: 1000 }), { nil: undefined }),
  tags: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 3 }),
})

describe('V8.6 Unlimited Batch Extraction Property Tests', () => {
  /**
   * **Feature: v8.6-no-question-left-behind, Property 1: No Artificial Array Cap**
   * **Validates: Requirements 1.1, 1.2, 1.4**
   */
  describe('Property 1: No Artificial Array Cap', () => {
    it('schema accepts arrays larger than 5 items', () => {
      fc.assert(
        fc.property(
          fc.array(validMCQBatchItemArb, { minLength: 6, maxLength: 50 }),
          (items) => {
            const result = mcqBatchDraftSchema.safeParse(items)
            // V8.6: Arrays with > 5 items should now pass (no .max(5))
            return result.success === true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('schema preserves all valid items without truncation', () => {
      fc.assert(
        fc.property(
          fc.array(validMCQBatchItemArb, { minLength: 1, maxLength: 50 }),
          (items) => {
            const result = mcqBatchDraftSchema.safeParse(items)
            if (!result.success) return false
            // Output count should equal input count for all-valid arrays
            return result.data.length === items.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('individual item validation filters invalid items correctly', () => {
      fc.assert(
        fc.property(
          fc.array(validMCQBatchItemArb, { minLength: 1, maxLength: 20 }),
          fc.array(invalidMCQBatchItemArb, { minLength: 1, maxLength: 10 }),
          (validItems, invalidItems) => {
            // Simulate the validation loop from draftBatchMCQFromText
            const mixedItems = [...validItems, ...invalidItems]
            const validDrafts: MCQBatchItem[] = []
            
            for (const item of mixedItems) {
              const itemResult = mcqBatchItemSchema.safeParse(item)
              if (itemResult.success) {
                validDrafts.push(itemResult.data)
              }
            }
            
            // All valid items should pass through, invalid items filtered
            return validDrafts.length === validItems.length
          }
        ),
        { numRuns: 100 }
      )
    })

    it('empty arrays are accepted', () => {
      const result = mcqBatchDraftSchema.safeParse([])
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })

    it('large arrays (20+ items) are processed without cap', () => {
      fc.assert(
        fc.property(
          fc.array(validMCQBatchItemArb, { minLength: 20, maxLength: 30 }),
          (items) => {
            const result = mcqBatchDraftSchema.safeParse(items)
            if (!result.success) return false
            // All 20+ items should be preserved
            return result.data.length === items.length && items.length >= 20
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
