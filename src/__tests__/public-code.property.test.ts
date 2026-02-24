import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { generatePublicCode } from '@/lib/public-code'
import { publicRegistrationSchema } from '@/lib/validations'

describe('generatePublicCode', () => {
  it('generates 6-char uppercase alphanumeric strings', () => {
    fc.assert(
      fc.property(fc.integer(), () => {
        const code = generatePublicCode()
        expect(code).toMatch(/^[A-Z0-9]{6}$/)
        expect(code.length).toBe(6)
      }),
      { numRuns: 100 }
    )
  })

  it('never contains ambiguous characters (0, O, 1, I)', () => {
    fc.assert(
      fc.property(fc.integer(), () => {
        const code = generatePublicCode()
        expect(code).not.toMatch(/[0O1I]/)
      }),
      { numRuns: 100 }
    )
  })

  it('generates unique codes across runs', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generatePublicCode()))
    expect(codes.size).toBe(100)
  })
})

describe('publicRegistrationSchema', () => {
  it('accepts name + email', () => {
    const result = publicRegistrationSchema.safeParse({ name: 'Budi', email: 'budi@gis.co' })
    expect(result.success).toBe(true)
  })

  it('accepts name + phone', () => {
    const result = publicRegistrationSchema.safeParse({ name: 'Siti', phone: '081234567890' })
    expect(result.success).toBe(true)
  })

  it('accepts name + email + phone', () => {
    const result = publicRegistrationSchema.safeParse({ name: 'Andi', email: 'andi@gis.co', phone: '081234567890' })
    expect(result.success).toBe(true)
  })

  it('rejects name only (no email or phone)', () => {
    const result = publicRegistrationSchema.safeParse({ name: 'Budi' })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = publicRegistrationSchema.safeParse({ name: '', email: 'budi@gis.co' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = publicRegistrationSchema.safeParse({ name: 'Budi', email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects short phone', () => {
    const result = publicRegistrationSchema.safeParse({ name: 'Budi', phone: '0812' })
    expect(result.success).toBe(false)
  })

  it('treats empty string email as absent (requires phone)', () => {
    const result = publicRegistrationSchema.safeParse({ name: 'Budi', email: '' })
    expect(result.success).toBe(false)
  })

  it('treats empty string phone as absent (requires email)', () => {
    const result = publicRegistrationSchema.safeParse({ name: 'Budi', phone: '' })
    expect(result.success).toBe(false)
  })
})
