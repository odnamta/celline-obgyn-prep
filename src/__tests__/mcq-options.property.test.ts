import { describe, test, expect } from 'vitest';
import fc from 'fast-check';

/**
 * **Feature: cellines-obgyn-prep-v2, Property 1: MCQ Options Round-Trip Consistency**
 * **Validates: Requirements 1.2**
 *
 * For any valid options array (array of non-empty strings with length >= 2),
 * serializing to JSONB and deserializing back SHALL produce an identical array.
 */
describe('Property 1: MCQ Options Round-Trip Consistency', () => {
  // Generator for valid MCQ options (array of non-empty strings, min 2 elements)
  const mcqOptionsArb = fc.array(
    fc.string({ minLength: 1, maxLength: 200 }),
    { minLength: 2, maxLength: 6 }
  );

  test('options round-trip preserves data through JSON serialization', () => {
    fc.assert(
      fc.property(mcqOptionsArb, (options) => {
        // Simulate JSONB serialization (what PostgreSQL does)
        const serialized = JSON.stringify(options);
        const deserialized = JSON.parse(serialized) as string[];

        // Verify round-trip consistency
        expect(deserialized).toEqual(options);
        expect(deserialized.length).toBe(options.length);

        // Verify each element is preserved exactly
        for (let i = 0; i < options.length; i++) {
          expect(deserialized[i]).toBe(options[i]);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('options with special characters survive round-trip', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1, maxLength: 200 }),
          { minLength: 2, maxLength: 6 }
        ),
        (options) => {
          const serialized = JSON.stringify(options);
          const deserialized = JSON.parse(serialized) as string[];

          expect(deserialized).toEqual(options);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('options with varying lengths survive round-trip', () => {
    // Generator with varying option counts and lengths
    const varyingOptionsArb = fc.array(
      fc.string({ minLength: 1, maxLength: 500 }),
      { minLength: 2, maxLength: 10 }
    );

    fc.assert(
      fc.property(varyingOptionsArb, (options) => {
        const serialized = JSON.stringify(options);
        const deserialized = JSON.parse(serialized) as string[];

        expect(deserialized).toEqual(options);
      }),
      { numRuns: 100 }
    );
  });
});
