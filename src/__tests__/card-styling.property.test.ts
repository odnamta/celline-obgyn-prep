import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { CARD_BASE_STYLES, getCardVariantClasses, CardVariant } from '../components/ui/Card';

const allVariants: CardVariant[] = ['default', 'elevated', 'outlined'];

/**
 * **Feature: v10, Property 7: Card Base Styling**
 * *For any* Card component rendered, the output should include rounded-xl, 
 * border-slate-200, and shadow-sm classes.
 * **Validates: Requirements 3.4**
 */
describe('Property 7: Card Base Styling', () => {
  it('base styles include rounded-xl', () => {
    expect(CARD_BASE_STYLES).toContain('rounded-xl');
  });

  it('base styles include border-slate-200', () => {
    expect(CARD_BASE_STYLES).toContain('border-slate-200');
  });

  it('base styles include shadow-sm', () => {
    expect(CARD_BASE_STYLES).toContain('shadow-sm');
  });

  it('base styles include bg-white', () => {
    expect(CARD_BASE_STYLES).toContain('bg-white');
  });

  it('base styles are consistent across multiple accesses', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        () => {
          expect(CARD_BASE_STYLES).toContain('rounded-xl');
          expect(CARD_BASE_STYLES).toContain('border-slate-200');
          expect(CARD_BASE_STYLES).toContain('shadow-sm');
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all variants return valid class strings', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allVariants),
        (variant) => {
          const classes = getCardVariantClasses(variant);
          // Classes should be a string (can be empty for default)
          expect(typeof classes).toBe('string');
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('elevated variant adds shadow-lg', () => {
    const classes = getCardVariantClasses('elevated');
    expect(classes).toContain('shadow-lg');
  });

  it('outlined variant removes shadow', () => {
    const classes = getCardVariantClasses('outlined');
    expect(classes).toContain('shadow-none');
  });
});
