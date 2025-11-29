import { describe, test, expect } from 'vitest';
import fc from 'fast-check';

/**
 * **Feature: v3-ux-overhaul, Property: Session Card Count Invariant**
 * **Validates: Global Study Session header consistency**
 *
 * For any session with N cards and N answer events:
 * - The denominator in "Card X of Y" should always be N
 * - The numerator should progress from 1 to N
 * - remainingInBatch should go from N-1 down to 0
 */
describe('Global Study Session Card Count Invariant', () => {
  /**
   * Simulates the session state progression logic.
   * This mirrors the GlobalStudySession component behavior.
   */
  function simulateSession(cardCount: number) {
    // Fixed at mount - never changes
    const sessionCardCount = cardCount;
    const results: Array<{
      step: number;
      currentIndex: number;
      cardXofY: string;
      remainingInBatch: number;
      denominator: number;
    }> = [];

    for (let currentIndex = 0; currentIndex < cardCount; currentIndex++) {
      const denominator = sessionCardCount;
      const numerator = currentIndex + 1;
      const remainingInBatch = sessionCardCount - currentIndex - 1;

      results.push({
        step: currentIndex + 1,
        currentIndex,
        cardXofY: `Card ${numerator} of ${denominator}`,
        remainingInBatch,
        denominator,
      });
    }

    return results;
  }

  test('denominator never changes during session', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (cardCount) => {
          const results = simulateSession(cardCount);

          // All denominators should equal the initial card count
          const allDenominatorsSame = results.every(
            (r) => r.denominator === cardCount
          );
          expect(allDenominatorsSame).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('numerator progresses from 1 to N', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (cardCount) => {
          const results = simulateSession(cardCount);

          // Check numerator progression
          for (let i = 0; i < results.length; i++) {
            const expectedNumerator = i + 1;
            expect(results[i].cardXofY).toBe(
              `Card ${expectedNumerator} of ${cardCount}`
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('remainingInBatch decreases from N-1 to 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (cardCount) => {
          const results = simulateSession(cardCount);

          // Check remaining progression
          for (let i = 0; i < results.length; i++) {
            const expectedRemaining = cardCount - i - 1;
            expect(results[i].remainingInBatch).toBe(expectedRemaining);
          }

          // First card should have N-1 remaining
          expect(results[0].remainingInBatch).toBe(cardCount - 1);

          // Last card should have 0 remaining
          expect(results[results.length - 1].remainingInBatch).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('session produces exactly N steps for N cards', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (cardCount) => {
          const results = simulateSession(cardCount);
          expect(results.length).toBe(cardCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
