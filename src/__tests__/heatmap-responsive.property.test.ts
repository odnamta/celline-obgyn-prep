import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import {
  getDayCountForViewport,
  LARGE_BREAKPOINT,
  SMALL_SCREEN_DAYS,
  LARGE_SCREEN_DAYS,
} from '../lib/use-responsive-day-count';

/**
 * **Feature: v3.2-visual-polish, Property 1: Heatmap Day Count by Viewport**
 * **Validates: Requirements 1.2, 1.3**
 * 
 * For any viewport width, the heatmap SHALL display exactly 28 days (4 rows × 7 cols)
 * when width is below the large breakpoint (1024px), and exactly 84 days (12 rows × 7 cols)
 * when width is at or above the large breakpoint.
 */
describe('Property 1: Heatmap Day Count by Viewport', () => {
  test('Viewport below large breakpoint returns 28 days', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: LARGE_BREAKPOINT - 1 }),
        (viewportWidth) => {
          const result = getDayCountForViewport(viewportWidth);
          expect(result).toBe(SMALL_SCREEN_DAYS);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Viewport at or above large breakpoint returns 84 days', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: LARGE_BREAKPOINT, max: 4000 }),
        (viewportWidth) => {
          const result = getDayCountForViewport(viewportWidth);
          expect(result).toBe(LARGE_SCREEN_DAYS);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Exact breakpoint boundary returns 84 days', () => {
    const result = getDayCountForViewport(LARGE_BREAKPOINT);
    expect(result).toBe(LARGE_SCREEN_DAYS);
  });

  test('One pixel below breakpoint returns 28 days', () => {
    const result = getDayCountForViewport(LARGE_BREAKPOINT - 1);
    expect(result).toBe(SMALL_SCREEN_DAYS);
  });

  test('Day count is always either 28 or 84', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5000 }),
        (viewportWidth) => {
          const result = getDayCountForViewport(viewportWidth);
          expect([SMALL_SCREEN_DAYS, LARGE_SCREEN_DAYS]).toContain(result);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Constants are correctly defined', () => {
    expect(LARGE_BREAKPOINT).toBe(1024);
    expect(SMALL_SCREEN_DAYS).toBe(28);
    expect(LARGE_SCREEN_DAYS).toBe(84);
  });
});
