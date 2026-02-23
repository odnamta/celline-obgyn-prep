import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  getAdminChecklist,
  getCandidateChecklist,
  isChecklistComplete,
} from '@/lib/setup-checklist'
import type { OrgStats, UserStats, ChecklistItem } from '@/lib/setup-checklist'

// --- Arbitraries ---

const orgStatsArb: fc.Arbitrary<OrgStats> = fc.record({
  deckCount: fc.nat({ max: 1000 }),
  cardCount: fc.nat({ max: 10000 }),
  assessmentCount: fc.nat({ max: 500 }),
  memberCount: fc.nat({ max: 500 }),
})

const userStatsArb: fc.Arbitrary<UserStats> = fc.record({
  hasName: fc.boolean(),
  hasAvatar: fc.boolean(),
  assessmentsTaken: fc.nat({ max: 500 }),
})

// --- Admin Checklist Properties ---

describe('getAdminChecklist', () => {
  it('always returns exactly 4 items', () => {
    fc.assert(
      fc.property(orgStatsArb, (stats) => {
        const items = getAdminChecklist(stats)
        expect(items).toHaveLength(4)
      })
    )
  })

  it('all items have required fields', () => {
    fc.assert(
      fc.property(orgStatsArb, (stats) => {
        const items = getAdminChecklist(stats)
        for (const item of items) {
          expect(item.id).toBeTruthy()
          expect(item.label).toBeTruthy()
          expect(item.description).toBeTruthy()
          expect(typeof item.done).toBe('boolean')
          expect(item.href).toMatch(/^\//)
        }
      })
    )
  })

  it('"Buat deck pertama" is done when deckCount > 0', () => {
    fc.assert(
      fc.property(orgStatsArb, (stats) => {
        const items = getAdminChecklist(stats)
        const deckItem = items.find((i) => i.id === 'create-first-deck')!
        expect(deckItem.done).toBe(stats.deckCount > 0)
      })
    )
  })

  it('"Tambah soal (min. 5)" is done when cardCount >= 5', () => {
    fc.assert(
      fc.property(orgStatsArb, (stats) => {
        const items = getAdminChecklist(stats)
        const cardItem = items.find((i) => i.id === 'add-cards')!
        expect(cardItem.done).toBe(stats.cardCount >= 5)
      })
    )
  })

  it('"Publikasi asesmen pertama" is done when assessmentCount > 0', () => {
    fc.assert(
      fc.property(orgStatsArb, (stats) => {
        const items = getAdminChecklist(stats)
        const assessmentItem = items.find((i) => i.id === 'publish-first-assessment')!
        expect(assessmentItem.done).toBe(stats.assessmentCount > 0)
      })
    )
  })

  it('"Undang kandidat" is done when memberCount > 1', () => {
    fc.assert(
      fc.property(orgStatsArb, (stats) => {
        const items = getAdminChecklist(stats)
        const memberItem = items.find((i) => i.id === 'invite-candidate')!
        expect(memberItem.done).toBe(stats.memberCount > 1)
      })
    )
  })
})

// --- Candidate Checklist Properties ---

describe('getCandidateChecklist', () => {
  it('always returns exactly 3 items', () => {
    fc.assert(
      fc.property(userStatsArb, (stats) => {
        const items = getCandidateChecklist(stats)
        expect(items).toHaveLength(3)
      })
    )
  })

  it('all items have required fields', () => {
    fc.assert(
      fc.property(userStatsArb, (stats) => {
        const items = getCandidateChecklist(stats)
        for (const item of items) {
          expect(item.id).toBeTruthy()
          expect(item.label).toBeTruthy()
          expect(item.description).toBeTruthy()
          expect(typeof item.done).toBe('boolean')
          expect(item.href).toMatch(/^\//)
        }
      })
    )
  })

  it('"Lengkapi profil" is done when hasName is true', () => {
    fc.assert(
      fc.property(userStatsArb, (stats) => {
        const items = getCandidateChecklist(stats)
        const profileItem = items.find((i) => i.id === 'complete-profile')!
        expect(profileItem.done).toBe(stats.hasName)
      })
    )
  })

  it('"Lihat asesmen tersedia" is done when assessmentsTaken > 0', () => {
    fc.assert(
      fc.property(userStatsArb, (stats) => {
        const items = getCandidateChecklist(stats)
        const viewItem = items.find((i) => i.id === 'view-assessments')!
        expect(viewItem.done).toBe(stats.assessmentsTaken > 0)
      })
    )
  })

  it('"Ikuti asesmen pertama" is done when assessmentsTaken > 0', () => {
    fc.assert(
      fc.property(userStatsArb, (stats) => {
        const items = getCandidateChecklist(stats)
        const takeItem = items.find((i) => i.id === 'take-first-assessment')!
        expect(takeItem.done).toBe(stats.assessmentsTaken > 0)
      })
    )
  })
})

// --- isChecklistComplete Properties ---

describe('isChecklistComplete', () => {
  const checklistItemArb: fc.Arbitrary<ChecklistItem> = fc.record({
    id: fc.string({ minLength: 1 }),
    label: fc.string({ minLength: 1 }),
    description: fc.string({ minLength: 1 }),
    done: fc.boolean(),
    href: fc.constant('/test'),
  })

  it('returns true only when all items have done === true', () => {
    fc.assert(
      fc.property(fc.array(checklistItemArb, { minLength: 1 }), (items) => {
        const allDone = items.every((i) => i.done)
        expect(isChecklistComplete(items)).toBe(allDone)
      })
    )
  })

  it('returns true for an all-done list', () => {
    fc.assert(
      fc.property(
        fc.array(checklistItemArb, { minLength: 1 }).map((items) =>
          items.map((i) => ({ ...i, done: true }))
        ),
        (items) => {
          expect(isChecklistComplete(items)).toBe(true)
        }
      )
    )
  })

  it('returns false when any single item is not done', () => {
    fc.assert(
      fc.property(
        fc.array(checklistItemArb, { minLength: 1 }).chain((items) => {
          const allDone = items.map((i) => ({ ...i, done: true }))
          return fc.nat({ max: allDone.length - 1 }).map((idx) => {
            allDone[idx] = { ...allDone[idx], done: false }
            return allDone
          })
        }),
        (items) => {
          expect(isChecklistComplete(items)).toBe(false)
        }
      )
    )
  })

  it('returns true for empty array (vacuous truth)', () => {
    expect(isChecklistComplete([])).toBe(true)
  })
})
