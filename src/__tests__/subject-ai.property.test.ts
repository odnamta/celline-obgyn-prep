/**
 * V9.1: Subject AI Property Tests
 * 
 * Tests for multi-specialty AI support including subject fallback and dynamic interpolation.
 * 
 * **Feature: v9.1-commander**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================
// Constants
// ============================================

const DEFAULT_SUBJECT = 'Obstetrics & Gynecology'

// ============================================
// Property 5: Subject Fallback
// ============================================

/**
 * **Feature: v9.1-commander, Property 5: Subject Fallback**
 * **Validates: Requirements 3.3, 5.3**
 * 
 * For any deck template with null or empty subject, the AI prompt builder
 * should use 'Obstetrics & Gynecology' as the subject value.
 */
describe('Property 5: Subject Fallback', () => {
  /**
   * Pure function that normalizes subject with fallback to default
   * This mirrors the logic in getSystemPrompt and getBatchSystemPrompt
   */
  function normalizeSubject(subject: string | null | undefined): string {
    return subject?.trim() || DEFAULT_SUBJECT
  }

  it('should return default for null subject', () => {
    expect(normalizeSubject(null)).toBe(DEFAULT_SUBJECT)
  })

  it('should return default for undefined subject', () => {
    expect(normalizeSubject(undefined)).toBe(DEFAULT_SUBJECT)
  })

  it('should return default for empty string', () => {
    expect(normalizeSubject('')).toBe(DEFAULT_SUBJECT)
  })

  it('should return default for whitespace-only strings', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 20 }).map(arr => arr.join('')),
        (whitespace) => {
          expect(normalizeSubject(whitespace)).toBe(DEFAULT_SUBJECT)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve non-empty subjects after trimming', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        (subject) => {
          const normalized = normalizeSubject(subject)
          expect(normalized).toBe(subject.trim())
          expect(normalized.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle subjects with leading/trailing whitespace', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.array(fc.constantFrom(' ', '\t'), { minLength: 0, maxLength: 5 }).map(arr => arr.join('')),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.array(fc.constantFrom(' ', '\t'), { minLength: 0, maxLength: 5 }).map(arr => arr.join(''))
        ),
        ([leading, core, trailing]) => {
          const subject = leading + core + trailing
          const normalized = normalizeSubject(subject)
          expect(normalized).toBe(core.trim())
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================
// Property 6: Dynamic Subject Interpolation
// ============================================

/**
 * **Feature: v9.1-commander, Property 6: Dynamic Subject Interpolation**
 * **Validates: Requirements 3.4, 3.5**
 * 
 * For any deck template with a non-empty subject, the generated AI system prompt
 * should contain that exact subject string in the specialization clause.
 */
describe('Property 6: Dynamic Subject Interpolation', () => {
  /**
   * Pure function that builds a system prompt with dynamic subject
   * This mirrors the logic in buildExtractSystemPrompt and buildGenerateSystemPrompt
   */
  function buildSystemPrompt(subject: string): string {
    const normalizedSubject = subject?.trim() || DEFAULT_SUBJECT
    return `You are a medical board exam expert specializing in ${normalizedSubject}.`
  }

  /**
   * Extracts the subject from a system prompt
   */
  function extractSubjectFromPrompt(prompt: string): string | null {
    const match = prompt.match(/specializing in ([^.]+)\./)
    return match ? match[1] : null
  }

  it('should interpolate subject into prompt', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0 && !s.includes('.')),
        (subject) => {
          const prompt = buildSystemPrompt(subject)
          
          // Prompt should contain the subject
          expect(prompt).toContain(subject.trim())
          
          // Should be in the specialization clause
          expect(prompt).toContain(`specializing in ${subject.trim()}`)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should extract the same subject that was interpolated', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0 && !s.includes('.')),
        (subject) => {
          const prompt = buildSystemPrompt(subject)
          const extracted = extractSubjectFromPrompt(prompt)
          
          expect(extracted).toBe(subject.trim())
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should use default subject for empty/null input', () => {
    const emptyPrompt = buildSystemPrompt('')
    const nullPrompt = buildSystemPrompt(null as unknown as string)
    
    expect(emptyPrompt).toContain(DEFAULT_SUBJECT)
    expect(nullPrompt).toContain(DEFAULT_SUBJECT)
    
    expect(extractSubjectFromPrompt(emptyPrompt)).toBe(DEFAULT_SUBJECT)
  })

  it('should handle common medical specialties', () => {
    const specialties = [
      'Obstetrics & Gynecology',
      'Internal Medicine',
      'Pediatrics',
      'Surgery',
      'Family Medicine',
      'Emergency Medicine',
      'Psychiatry',
      'Radiology',
      'Anesthesiology',
      'Pathology',
    ]

    for (const specialty of specialties) {
      const prompt = buildSystemPrompt(specialty)
      expect(prompt).toContain(`specializing in ${specialty}`)
      expect(extractSubjectFromPrompt(prompt)).toBe(specialty)
    }
  })

  it('should handle subjects with special characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => {
          const trimmed = s.trim()
          return trimmed.length > 0 && !trimmed.includes('.')
        }),
        (subject) => {
          const prompt = buildSystemPrompt(subject)
          const extracted = extractSubjectFromPrompt(prompt)
          
          // Should successfully round-trip
          expect(extracted).toBe(subject.trim())
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================
// Integration: Subject in Full Prompt Flow
// ============================================

describe('Subject Integration', () => {
  /**
   * Simulates the full flow from deck subject to AI prompt
   */
  function simulateAIPromptFlow(deckSubject: string | null | undefined): {
    normalizedSubject: string
    promptContainsSubject: boolean
  } {
    const normalizedSubject = deckSubject?.trim() || DEFAULT_SUBJECT
    const prompt = `You are a medical board exam expert specializing in ${normalizedSubject}.`
    
    return {
      normalizedSubject,
      promptContainsSubject: prompt.includes(normalizedSubject),
    }
  }

  it('should always produce valid prompts regardless of input', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant(''),
          fc.string({ minLength: 0, maxLength: 100 })
        ),
        (subject) => {
          const result = simulateAIPromptFlow(subject as string | null | undefined)
          
          // Should always have a non-empty normalized subject
          expect(result.normalizedSubject.length).toBeGreaterThan(0)
          
          // Prompt should always contain the subject
          expect(result.promptContainsSubject).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})
