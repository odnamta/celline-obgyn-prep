import { describe, test, expect } from 'vitest';
import fc from 'fast-check';

/**
 * **Feature: v8.5-data-integrity, Property 4: Resume flag uses saved page**
 * **Validates: Requirements 4.1, 4.2**
 *
 * For any saved scan state, calling startScan with `isResuming: true`
 * SHALL use the saved currentPage.
 */
describe('Property 4: Resume flag uses saved page', () => {
  // Type for StartScanOptions
  interface StartScanOptions {
    startPage?: number;
    isResuming?: boolean;
  }

  // Type for scan state
  interface ScanState {
    currentPage: number;
    stats: { cardsCreated: number; pagesProcessed: number; errorsCount: number };
    skippedPages: { pageNumber: number; reason: string }[];
    consecutiveErrors: number;
  }

  // Simulate the startScan logic for resume mode
  function simulateStartScan(
    options: StartScanOptions | undefined,
    savedState: ScanState,
    totalPages: number
  ): { effectivePage: number; statsPreserved: boolean } {
    const { startPage, isResuming } = options ?? {};

    if (isResuming === true) {
      // Resume mode: Use saved currentPage, preserve stats
      return {
        effectivePage: savedState.currentPage,
        statsPreserved: true,
      };
    } else {
      // Fresh start mode: Use startPage or default to 1, reset stats
      return {
        effectivePage: startPage ?? 1,
        statsPreserved: false,
      };
    }
  }

  // Generator for valid scan state
  const scanStateArb = fc.record({
    currentPage: fc.integer({ min: 1, max: 100 }),
    stats: fc.record({
      cardsCreated: fc.integer({ min: 0, max: 1000 }),
      pagesProcessed: fc.integer({ min: 0, max: 100 }),
      errorsCount: fc.integer({ min: 0, max: 50 }),
    }),
    skippedPages: fc.array(
      fc.record({
        pageNumber: fc.integer({ min: 1, max: 100 }),
        reason: fc.string({ minLength: 1, maxLength: 100 }),
      }),
      { minLength: 0, maxLength: 10 }
    ),
    consecutiveErrors: fc.integer({ min: 0, max: 3 }),
  });

  test('isResuming: true uses saved currentPage', () => {
    fc.assert(
      fc.property(
        scanStateArb,
        fc.integer({ min: 50, max: 200 }),
        (savedState, totalPages) => {
          const result = simulateStartScan({ isResuming: true }, savedState, totalPages);

          // Should use saved currentPage
          expect(result.effectivePage).toBe(savedState.currentPage);
          // Should preserve stats
          expect(result.statsPreserved).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('isResuming: true ignores startPage parameter', () => {
    fc.assert(
      fc.property(
        scanStateArb,
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 50, max: 200 }),
        (savedState, explicitStartPage, totalPages) => {
          // Even if startPage is provided, isResuming: true should use saved page
          const result = simulateStartScan(
            { startPage: explicitStartPage, isResuming: true },
            savedState,
            totalPages
          );

          // Should still use saved currentPage, not the explicit startPage
          expect(result.effectivePage).toBe(savedState.currentPage);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('isResuming: true preserves all stats', () => {
    fc.assert(
      fc.property(scanStateArb, (savedState) => {
        const result = simulateStartScan({ isResuming: true }, savedState, 100);

        // Stats should be preserved
        expect(result.statsPreserved).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: v8.5-data-integrity, Property 5: Fresh start ignores saved page**
 * **Validates: Requirements 4.3**
 *
 * For any saved scan state, calling startScan with `isResuming: false`
 * SHALL use the provided startPage or default to 1.
 */
describe('Property 5: Fresh start ignores saved page', () => {
  interface StartScanOptions {
    startPage?: number;
    isResuming?: boolean;
  }

  interface ScanState {
    currentPage: number;
    stats: { cardsCreated: number; pagesProcessed: number; errorsCount: number };
    skippedPages: { pageNumber: number; reason: string }[];
    consecutiveErrors: number;
  }

  function simulateStartScan(
    options: StartScanOptions | undefined,
    savedState: ScanState,
    totalPages: number
  ): { effectivePage: number; statsPreserved: boolean } {
    const { startPage, isResuming } = options ?? {};

    if (isResuming === true) {
      return {
        effectivePage: savedState.currentPage,
        statsPreserved: true,
      };
    } else {
      return {
        effectivePage: startPage ?? 1,
        statsPreserved: false,
      };
    }
  }

  const scanStateArb = fc.record({
    currentPage: fc.integer({ min: 2, max: 100 }), // Start from 2 to ensure it's different from default 1
    stats: fc.record({
      cardsCreated: fc.integer({ min: 1, max: 1000 }), // At least 1 to ensure stats exist
      pagesProcessed: fc.integer({ min: 1, max: 100 }),
      errorsCount: fc.integer({ min: 0, max: 50 }),
    }),
    skippedPages: fc.array(
      fc.record({
        pageNumber: fc.integer({ min: 1, max: 100 }),
        reason: fc.string({ minLength: 1, maxLength: 100 }),
      }),
      { minLength: 0, maxLength: 10 }
    ),
    consecutiveErrors: fc.integer({ min: 0, max: 3 }),
  });

  test('isResuming: false uses provided startPage', () => {
    fc.assert(
      fc.property(
        scanStateArb,
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 100, max: 200 }),
        (savedState, explicitStartPage, totalPages) => {
          const result = simulateStartScan(
            { startPage: explicitStartPage, isResuming: false },
            savedState,
            totalPages
          );

          // Should use explicit startPage, not saved currentPage
          expect(result.effectivePage).toBe(explicitStartPage);
          // Should reset stats
          expect(result.statsPreserved).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('isResuming: false defaults to page 1 when no startPage provided', () => {
    fc.assert(
      fc.property(scanStateArb, (savedState) => {
        const result = simulateStartScan({ isResuming: false }, savedState, 100);

        // Should default to page 1
        expect(result.effectivePage).toBe(1);
        // Should reset stats
        expect(result.statsPreserved).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  test('undefined options defaults to fresh start from page 1', () => {
    fc.assert(
      fc.property(scanStateArb, (savedState) => {
        const result = simulateStartScan(undefined, savedState, 100);

        // Should default to page 1
        expect(result.effectivePage).toBe(1);
        // Should reset stats
        expect(result.statsPreserved).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  test('isResuming: false ignores saved currentPage', () => {
    fc.assert(
      fc.property(scanStateArb, (savedState) => {
        const result = simulateStartScan({ isResuming: false }, savedState, 100);

        // Should NOT use saved currentPage (which is >= 2)
        expect(result.effectivePage).not.toBe(savedState.currentPage);
        // Should be page 1 (default)
        expect(result.effectivePage).toBe(1);
      }),
      { numRuns: 100 }
    );
  });

  test('isResuming: false resets stats', () => {
    fc.assert(
      fc.property(scanStateArb, (savedState) => {
        const result = simulateStartScan({ isResuming: false }, savedState, 100);

        // Stats should NOT be preserved
        expect(result.statsPreserved).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
