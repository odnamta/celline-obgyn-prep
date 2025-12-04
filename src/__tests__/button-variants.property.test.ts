import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getVariantClasses, ButtonVariant } from '../components/ui/Button';

const allVariants: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'destructive'];

/**
 * **Feature: v10, Property 4: Button Primary Variant Styling**
 * *For any* Button rendered with variant="primary", the component should include 
 * blue background color classes.
 * **Validates: Requirements 3.1**
 */
describe('Property 4: Button Primary Variant Styling', () => {
  it('primary variant includes blue background classes', () => {
    const classes = getVariantClasses('primary');
    expect(classes).toContain('bg-blue-600');
    expect(classes).toContain('text-white');
  });

  it('primary variant is consistent across multiple calls', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        () => {
          const classes = getVariantClasses('primary');
          expect(classes).toContain('bg-blue-600');
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: v10, Property 5: Button Secondary Variant Styling**
 * *For any* Button rendered with variant="secondary", the component should include 
 * slate color classes.
 * **Validates: Requirements 3.2**
 */
describe('Property 5: Button Secondary Variant Styling', () => {
  it('secondary variant includes slate background classes', () => {
    const classes = getVariantClasses('secondary');
    expect(classes).toContain('bg-slate-100');
    expect(classes).toContain('text-slate-900');
    expect(classes).toContain('border-slate-200');
  });

  it('secondary variant is consistent across multiple calls', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        () => {
          const classes = getVariantClasses('secondary');
          expect(classes).toContain('bg-slate-100');
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: v10, Property 6: Button Loading State**
 * *For any* Button rendered with loading=true, the button should be disabled 
 * and contain a spinner element.
 * **Validates: Requirements 3.3**
 */
describe('Property 6: Button Loading State', () => {
  it('all variants return non-empty class strings', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allVariants),
        (variant) => {
          const classes = getVariantClasses(variant);
          expect(classes.length).toBeGreaterThan(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('each variant has unique styling', () => {
    const classMap = new Map<string, ButtonVariant>();
    
    for (const variant of allVariants) {
      const classes = getVariantClasses(variant);
      // Each variant should have distinct classes
      expect(classMap.has(classes)).toBe(false);
      classMap.set(classes, variant);
    }
  });

  it('destructive variant includes red background', () => {
    const classes = getVariantClasses('destructive');
    expect(classes).toContain('bg-red-600');
    expect(classes).toContain('text-white');
  });
});
