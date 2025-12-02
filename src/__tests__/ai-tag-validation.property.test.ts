import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { mcqBatchItemSchema } from '../lib/batch-mcq-schema';

/**
 * **Feature: v8.5-data-integrity, Property 2: Tag validation rejects empty tags**
 * **Validates: Requirements 2.1, 2.2**
 *
 * For any MCQ draft with an empty or missing tags array, schema validation SHALL reject it.
 */
describe('Property 2: Tag validation rejects empty tags', () => {
  // Generator for a valid MCQ draft base (without tags)
  const validMcqBaseArb = fc.record({
    stem: fc.string({ minLength: 10, maxLength: 200 }),
    options: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 5 }),
    correctIndex: fc.integer({ min: 0, max: 4 }),
    explanation: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
  });

  test('MCQ with missing tags field is rejected', () => {
    fc.assert(
      fc.property(validMcqBaseArb, (mcqBase) => {
        // Ensure correctIndex is valid for the options array
        const validCorrectIndex = Math.min(mcqBase.correctIndex, mcqBase.options.length - 1);
        const mcqWithoutTags = {
          ...mcqBase,
          correctIndex: validCorrectIndex,
        };

        const result = mcqBatchItemSchema.safeParse(mcqWithoutTags);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  test('MCQ with empty tags array is rejected', () => {
    fc.assert(
      fc.property(validMcqBaseArb, (mcqBase) => {
        const validCorrectIndex = Math.min(mcqBase.correctIndex, mcqBase.options.length - 1);
        const mcqWithEmptyTags = {
          ...mcqBase,
          correctIndex: validCorrectIndex,
          tags: [],
        };

        const result = mcqBatchItemSchema.safeParse(mcqWithEmptyTags);
        expect(result.success).toBe(false);
        if (!result.success) {
          // Should have error about minimum tags
          const hasMinTagsError = result.error.issues.some(
            (issue) => issue.message.includes('at least 1 tag')
          );
          expect(hasMinTagsError).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('MCQ with tags containing only empty strings is rejected', () => {
    fc.assert(
      fc.property(
        validMcqBaseArb,
        fc.integer({ min: 1, max: 3 }),
        (mcqBase, emptyTagCount) => {
          const validCorrectIndex = Math.min(mcqBase.correctIndex, mcqBase.options.length - 1);
          const mcqWithEmptyStringTags = {
            ...mcqBase,
            correctIndex: validCorrectIndex,
            tags: Array(emptyTagCount).fill(''),
          };

          const result = mcqBatchItemSchema.safeParse(mcqWithEmptyStringTags);
          expect(result.success).toBe(false);
          if (!result.success) {
            // Should have error about empty tag
            const hasEmptyTagError = result.error.issues.some(
              (issue) => issue.message.includes('Tag cannot be empty')
            );
            expect(hasEmptyTagError).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('MCQ with null tags is rejected', () => {
    fc.assert(
      fc.property(validMcqBaseArb, (mcqBase) => {
        const validCorrectIndex = Math.min(mcqBase.correctIndex, mcqBase.options.length - 1);
        const mcqWithNullTags = {
          ...mcqBase,
          correctIndex: validCorrectIndex,
          tags: null,
        };

        const result = mcqBatchItemSchema.safeParse(mcqWithNullTags);
        expect(result.success).toBe(false);
      }),
      { numRuns: 50 }
    );
  });

  test('MCQ with undefined tags is rejected', () => {
    fc.assert(
      fc.property(validMcqBaseArb, (mcqBase) => {
        const validCorrectIndex = Math.min(mcqBase.correctIndex, mcqBase.options.length - 1);
        const mcqWithUndefinedTags = {
          ...mcqBase,
          correctIndex: validCorrectIndex,
          tags: undefined,
        };

        const result = mcqBatchItemSchema.safeParse(mcqWithUndefinedTags);
        expect(result.success).toBe(false);
      }),
      { numRuns: 50 }
    );
  });
});

/**
 * **Feature: v8.5-data-integrity, Property 3: Valid tags pass validation**
 * **Validates: Requirements 2.1**
 *
 * For any MCQ draft with 1-3 non-empty tag strings, schema validation SHALL accept it.
 */
describe('Property 3: Valid tags pass validation', () => {
  // Generator for a valid tag (non-empty, max 30 chars)
  const validTagArb = fc.string({ minLength: 1, maxLength: 30 });

  // Generator for a valid tags array (1-3 tags)
  const validTagsArrayArb = fc.array(validTagArb, { minLength: 1, maxLength: 3 });

  // Generator for a complete valid MCQ
  const validMcqArb = fc
    .record({
      stem: fc.string({ minLength: 10, maxLength: 200 }),
      options: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 5 }),
      correctIndex: fc.integer({ min: 0, max: 4 }),
      explanation: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
      tags: validTagsArrayArb,
    })
    .map((mcq) => ({
      ...mcq,
      // Ensure correctIndex is valid for the options array
      correctIndex: Math.min(mcq.correctIndex, mcq.options.length - 1),
    }));

  test('MCQ with 1-3 valid tags passes validation', () => {
    fc.assert(
      fc.property(validMcqArb, (mcq) => {
        const result = mcqBatchItemSchema.safeParse(mcq);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.tags.length).toBeGreaterThanOrEqual(1);
          expect(result.data.tags.length).toBeLessThanOrEqual(3);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('MCQ with exactly 1 tag passes validation', () => {
    fc.assert(
      fc.property(
        fc.record({
          stem: fc.string({ minLength: 10, maxLength: 200 }),
          options: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 5 }),
          correctIndex: fc.integer({ min: 0, max: 4 }),
          explanation: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
          tags: fc.array(validTagArb, { minLength: 1, maxLength: 1 }),
        }),
        (mcqBase) => {
          const mcq = {
            ...mcqBase,
            correctIndex: Math.min(mcqBase.correctIndex, mcqBase.options.length - 1),
          };
          const result = mcqBatchItemSchema.safeParse(mcq);
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('MCQ with exactly 3 tags passes validation', () => {
    fc.assert(
      fc.property(
        fc.record({
          stem: fc.string({ minLength: 10, maxLength: 200 }),
          options: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 5 }),
          correctIndex: fc.integer({ min: 0, max: 4 }),
          explanation: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
          tags: fc.array(validTagArb, { minLength: 3, maxLength: 3 }),
        }),
        (mcqBase) => {
          const mcq = {
            ...mcqBase,
            correctIndex: Math.min(mcqBase.correctIndex, mcqBase.options.length - 1),
          };
          const result = mcqBatchItemSchema.safeParse(mcq);
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('MCQ with more than 3 tags is rejected', () => {
    fc.assert(
      fc.property(
        fc.record({
          stem: fc.string({ minLength: 10, maxLength: 200 }),
          options: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 5 }),
          correctIndex: fc.integer({ min: 0, max: 4 }),
          explanation: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
          tags: fc.array(validTagArb, { minLength: 4, maxLength: 6 }),
        }),
        (mcqBase) => {
          const mcq = {
            ...mcqBase,
            correctIndex: Math.min(mcqBase.correctIndex, mcqBase.options.length - 1),
          };
          const result = mcqBatchItemSchema.safeParse(mcq);
          expect(result.success).toBe(false);
          if (!result.success) {
            const hasMaxTagsError = result.error.issues.some(
              (issue) => issue.message.includes('at most 3 tags')
            );
            expect(hasMaxTagsError).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Tag with more than 30 characters is rejected', () => {
    fc.assert(
      fc.property(
        fc.record({
          stem: fc.string({ minLength: 10, maxLength: 200 }),
          options: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 5 }),
          correctIndex: fc.integer({ min: 0, max: 4 }),
          explanation: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
          tags: fc.tuple(fc.string({ minLength: 31, maxLength: 50 })).map((t) => [t[0]]),
        }),
        (mcqBase) => {
          const mcq = {
            ...mcqBase,
            correctIndex: Math.min(mcqBase.correctIndex, mcqBase.options.length - 1),
          };
          const result = mcqBatchItemSchema.safeParse(mcq);
          expect(result.success).toBe(false);
          if (!result.success) {
            const hasMaxLengthError = result.error.issues.some(
              (issue) => issue.message.includes('at most 30 characters')
            );
            expect(hasMaxLengthError).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
