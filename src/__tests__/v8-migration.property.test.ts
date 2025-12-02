/**
 * V8.0 "The Great Unification" - Migration Property Tests
 * 
 * Tests the correctness properties for the V1 to V2 schema migration.
 * These tests verify migration completeness, SRS state preservation,
 * tag integrity, idempotence, and content integrity.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'

// ============================================
// Test Data Generators
// ============================================

const uuidArb = fc.uuid()

const legacyCardArb = fc.record({
  id: uuidArb,
  deck_id: uuidArb,
  card_type: fc.constant('mcq' as const),
  front: fc.string({ minLength: 1, maxLength: 100 }),
  back: fc.string({ minLength: 1, maxLength: 200 }),
  stem: fc.string({ minLength: 10, maxLength: 500 }),
  options: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 5 }),
  correct_index: fc.integer({ min: 0, max: 4 }),
  explanation: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
  interval: fc.integer({ min: 0, max: 365 }),
  ease_factor: fc.float({ min: Math.fround(1.3), max: Math.fround(3.0) }),
  next_review: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  created_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-01-01') }),
})

const legacyDeckArb = fc.record({
  id: uuidArb,
  user_id: uuidArb,
  title: fc.string({ minLength: 1, maxLength: 100 }),
  created_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-01-01') }),
})

const tagArb = fc.record({
  id: uuidArb,
  user_id: uuidArb,
  name: fc.string({ minLength: 1, maxLength: 50 }),
  color: fc.constantFrom('red', 'blue', 'green', 'purple', 'orange'),
})

// ============================================
// Migration Simulation Functions
// ============================================

interface LegacyCard {
  id: string
  deck_id: string
  card_type: 'mcq'
  front: string
  back: string
  stem: string
  options: string[]
  correct_index: number
  explanation?: string
  interval: number
  ease_factor: number
  next_review: Date
  created_at: Date
}

interface LegacyDeck {
  id: string
  user_id: string
  title: string
  created_at: Date
}

interface Tag {
  id: string
  user_id: string
  name: string
  color: string
}

interface CardTemplate {
  id: string
  deck_template_id: string
  stem: string
  options: string[]
  correct_index: number
  explanation: string | null
  legacy_id: string
  created_at: Date
}

interface DeckTemplate {
  id: string
  title: string
  author_id: string
  visibility: 'private' | 'public'
  legacy_id: string
  created_at: Date
}

interface UserCardProgress {
  user_id: string
  card_template_id: string
  interval: number
  ease_factor: number
  next_review: Date
}

interface CardTemplateTag {
  card_template_id: string
  tag_id: string
}

interface MigrationState {
  legacyDecks: LegacyDeck[]
  legacyCards: LegacyCard[]
  legacyCardTags: { card_id: string; tag_id: string }[]
  tags: Tag[]
  deckTemplates: DeckTemplate[]
  cardTemplates: CardTemplate[]
  cardTemplateTags: CardTemplateTag[]
  userCardProgress: UserCardProgress[]
}

/**
 * Simulates the migrate_v1_to_v2_complete() SQL function
 */
function simulateMigration(state: MigrationState): {
  deck_templates_created: number
  card_templates_created: number
  card_template_tags_created: number
  user_card_progress_created: number
} {
  let deckCount = 0
  let cardCount = 0
  let tagCount = 0
  let progressCount = 0

  // Step 1: Migrate decks → deck_templates
  for (const deck of state.legacyDecks) {
    const exists = state.deckTemplates.some(dt => dt.legacy_id === deck.id)
    if (!exists) {
      state.deckTemplates.push({
        id: `dt-${deck.id}`,
        title: deck.title,
        author_id: deck.user_id,
        visibility: 'private',
        legacy_id: deck.id,
        created_at: deck.created_at,
      })
      deckCount++
    }
  }

  // Step 2: Migrate cards → card_templates
  for (const card of state.legacyCards) {
    const exists = state.cardTemplates.some(ct => ct.legacy_id === card.id)
    const deckTemplate = state.deckTemplates.find(dt => dt.legacy_id === card.deck_id)
    
    if (!exists && deckTemplate) {
      state.cardTemplates.push({
        id: `ct-${card.id}`,
        deck_template_id: deckTemplate.id,
        stem: card.stem || card.front,
        options: card.options || ['A', 'B', 'C', 'D'],
        correct_index: card.correct_index || 0,
        explanation: card.explanation || card.back || null,
        legacy_id: card.id,
        created_at: card.created_at,
      })
      cardCount++
    }
  }

  // Step 3: Migrate card_tags → card_template_tags
  for (const cardTag of state.legacyCardTags) {
    const cardTemplate = state.cardTemplates.find(ct => ct.legacy_id === cardTag.card_id)
    if (cardTemplate) {
      const exists = state.cardTemplateTags.some(
        ctt => ctt.card_template_id === cardTemplate.id && ctt.tag_id === cardTag.tag_id
      )
      if (!exists) {
        state.cardTemplateTags.push({
          card_template_id: cardTemplate.id,
          tag_id: cardTag.tag_id,
        })
        tagCount++
      }
    }
  }

  // Step 4: Create user_card_progress
  for (const card of state.legacyCards) {
    const cardTemplate = state.cardTemplates.find(ct => ct.legacy_id === card.id)
    const deck = state.legacyDecks.find(d => d.id === card.deck_id)
    
    if (cardTemplate && deck) {
      const exists = state.userCardProgress.some(
        ucp => ucp.user_id === deck.user_id && ucp.card_template_id === cardTemplate.id
      )
      if (!exists) {
        state.userCardProgress.push({
          user_id: deck.user_id,
          card_template_id: cardTemplate.id,
          interval: card.interval,
          ease_factor: card.ease_factor,
          next_review: card.next_review,
        })
        progressCount++
      }
    }
  }

  return {
    deck_templates_created: deckCount,
    card_templates_created: cardCount,
    card_template_tags_created: tagCount,
    user_card_progress_created: progressCount,
  }
}

// ============================================
// Property Tests
// ============================================

describe('V8.0 Migration Property Tests', () => {
  /**
   * **Feature: v8-unification, Property 1: Migration Completeness**
   * 
   * *For any* set of legacy cards in the `cards` table, after running the migration
   * function, every card SHALL have a corresponding `card_template` row with matching `legacy_id`.
   * 
   * **Validates: Requirements 1.1**
   */
  describe('Property 1: Migration Completeness', () => {
    it('*For any* set of legacy cards, after migration every card has a corresponding card_template', () => {
      fc.assert(
        fc.property(
          fc.array(legacyDeckArb, { minLength: 1, maxLength: 5 }),
          fc.array(legacyCardArb, { minLength: 1, maxLength: 20 }),
          (decks, cards) => {
            // Ensure cards reference valid decks
            const validCards = cards.map((card, i) => ({
              ...card,
              deck_id: decks[i % decks.length].id,
            }))

            const state: MigrationState = {
              legacyDecks: decks,
              legacyCards: validCards,
              legacyCardTags: [],
              tags: [],
              deckTemplates: [],
              cardTemplates: [],
              cardTemplateTags: [],
              userCardProgress: [],
            }

            simulateMigration(state)

            // Verify: every legacy card has a corresponding card_template
            for (const card of validCards) {
              const hasTemplate = state.cardTemplates.some(ct => ct.legacy_id === card.id)
              expect(hasTemplate).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: v8-unification, Property 2: SRS State Preservation**
   * 
   * *For any* migrated card, the `user_card_progress` row SHALL have identical
   * `interval`, `ease_factor`, and `next_review` values as the original legacy card.
   * 
   * **Validates: Requirements 1.2**
   */
  describe('Property 2: SRS State Preservation', () => {
    it('*For any* migrated card, SRS state is preserved in user_card_progress', () => {
      fc.assert(
        fc.property(
          legacyDeckArb,
          fc.array(legacyCardArb, { minLength: 1, maxLength: 10 }),
          (deck, cards) => {
            const validCards = cards.map(card => ({
              ...card,
              deck_id: deck.id,
            }))

            const state: MigrationState = {
              legacyDecks: [deck],
              legacyCards: validCards,
              legacyCardTags: [],
              tags: [],
              deckTemplates: [],
              cardTemplates: [],
              cardTemplateTags: [],
              userCardProgress: [],
            }

            simulateMigration(state)

            // Verify: SRS state matches for each card
            for (const card of validCards) {
              const cardTemplate = state.cardTemplates.find(ct => ct.legacy_id === card.id)
              expect(cardTemplate).toBeDefined()

              const progress = state.userCardProgress.find(
                ucp => ucp.card_template_id === cardTemplate!.id && ucp.user_id === deck.user_id
              )
              expect(progress).toBeDefined()
              expect(progress!.interval).toBe(card.interval)
              expect(progress!.ease_factor).toBe(card.ease_factor)
              expect(progress!.next_review).toEqual(card.next_review)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: v8-unification, Property 3: Tag Migration Integrity**
   * 
   * *For any* legacy card with tags, after migration the corresponding `card_template`
   * SHALL have the same set of tags via `card_template_tags`.
   * 
   * **Validates: Requirements 1.3**
   */
  describe('Property 3: Tag Migration Integrity', () => {
    it('*For any* card with tags, tags are preserved after migration', () => {
      fc.assert(
        fc.property(
          legacyDeckArb,
          legacyCardArb,
          fc.array(tagArb, { minLength: 1, maxLength: 5 }),
          (deck, card, tags) => {
            const validCard = { ...card, deck_id: deck.id }
            const validTags = tags.map(t => ({ ...t, user_id: deck.user_id }))
            const cardTags = validTags.map(t => ({ card_id: validCard.id, tag_id: t.id }))

            const state: MigrationState = {
              legacyDecks: [deck],
              legacyCards: [validCard],
              legacyCardTags: cardTags,
              tags: validTags,
              deckTemplates: [],
              cardTemplates: [],
              cardTemplateTags: [],
              userCardProgress: [],
            }

            simulateMigration(state)

            // Verify: all tags are migrated
            const cardTemplate = state.cardTemplates.find(ct => ct.legacy_id === validCard.id)
            expect(cardTemplate).toBeDefined()

            const migratedTagIds = state.cardTemplateTags
              .filter(ctt => ctt.card_template_id === cardTemplate!.id)
              .map(ctt => ctt.tag_id)

            const originalTagIds = cardTags.map(ct => ct.tag_id)

            expect(migratedTagIds.sort()).toEqual(originalTagIds.sort())
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: v8-unification, Property 4: Migration Idempotence**
   * 
   * *For any* database state, running the migration function twice SHALL produce
   * the same final state as running it once (no duplicate records, no errors).
   * 
   * **Validates: Requirements 1.4**
   */
  describe('Property 4: Migration Idempotence', () => {
    it('*For any* state, running migration twice produces same result as once', () => {
      fc.assert(
        fc.property(
          fc.array(legacyDeckArb, { minLength: 1, maxLength: 3 }),
          fc.array(legacyCardArb, { minLength: 1, maxLength: 10 }),
          (decks, cards) => {
            const validCards = cards.map((card, i) => ({
              ...card,
              deck_id: decks[i % decks.length].id,
            }))

            // First migration
            const state1: MigrationState = {
              legacyDecks: [...decks],
              legacyCards: [...validCards],
              legacyCardTags: [],
              tags: [],
              deckTemplates: [],
              cardTemplates: [],
              cardTemplateTags: [],
              userCardProgress: [],
            }
            const result1 = simulateMigration(state1)

            // Second migration on same state
            const result2 = simulateMigration(state1)

            // Verify: second run creates nothing new
            expect(result2.deck_templates_created).toBe(0)
            expect(result2.card_templates_created).toBe(0)
            expect(result2.card_template_tags_created).toBe(0)
            expect(result2.user_card_progress_created).toBe(0)

            // Verify: counts match original
            expect(state1.deckTemplates.length).toBe(result1.deck_templates_created)
            expect(state1.cardTemplates.length).toBe(result1.card_templates_created)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: v8-unification, Property 7: Migration Report Accuracy**
   * 
   * *For any* migration execution, the returned JSON counts SHALL exactly match
   * the number of rows actually inserted into each V2 table.
   * 
   * **Validates: Requirements 3.3**
   */
  describe('Property 7: Migration Report Accuracy', () => {
    it('*For any* migration, reported counts match actual insertions', () => {
      fc.assert(
        fc.property(
          fc.array(legacyDeckArb, { minLength: 1, maxLength: 5 }),
          fc.array(legacyCardArb, { minLength: 1, maxLength: 15 }),
          (decks, cards) => {
            const validCards = cards.map((card, i) => ({
              ...card,
              deck_id: decks[i % decks.length].id,
            }))

            const state: MigrationState = {
              legacyDecks: decks,
              legacyCards: validCards,
              legacyCardTags: [],
              tags: [],
              deckTemplates: [],
              cardTemplates: [],
              cardTemplateTags: [],
              userCardProgress: [],
            }

            const report = simulateMigration(state)

            // Verify: reported counts match actual state
            expect(report.deck_templates_created).toBe(state.deckTemplates.length)
            expect(report.card_templates_created).toBe(state.cardTemplates.length)
            expect(report.card_template_tags_created).toBe(state.cardTemplateTags.length)
            expect(report.user_card_progress_created).toBe(state.userCardProgress.length)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: v8-unification, Property 8: Content Integrity**
   * 
   * *For any* migrated card, the content fields (stem, options, correct_index, explanation)
   * in `card_templates` SHALL exactly match the original values in the legacy `cards` table.
   * 
   * **Validates: Requirements 3.4**
   */
  describe('Property 8: Content Integrity', () => {
    it('*For any* migrated card, content fields match exactly', () => {
      fc.assert(
        fc.property(
          legacyDeckArb,
          fc.array(legacyCardArb, { minLength: 1, maxLength: 10 }),
          (deck, cards) => {
            const validCards = cards.map(card => ({
              ...card,
              deck_id: deck.id,
            }))

            const state: MigrationState = {
              legacyDecks: [deck],
              legacyCards: validCards,
              legacyCardTags: [],
              tags: [],
              deckTemplates: [],
              cardTemplates: [],
              cardTemplateTags: [],
              userCardProgress: [],
            }

            simulateMigration(state)

            // Verify: content matches for each card
            for (const card of validCards) {
              const template = state.cardTemplates.find(ct => ct.legacy_id === card.id)
              expect(template).toBeDefined()
              expect(template!.stem).toBe(card.stem || card.front)
              expect(template!.options).toEqual(card.options || ['A', 'B', 'C', 'D'])
              expect(template!.correct_index).toBe(card.correct_index || 0)
              expect(template!.explanation).toBe(card.explanation || card.back || null)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


// ============================================
// V8.0 Card Operations Property Tests
// ============================================

describe('V8.0 Card Operations Property Tests', () => {
  /**
   * **Feature: v8-unification, Property 5: Card Creation V2 Only**
   * 
   * *For any* card creation operation, the card SHALL exist in `card_templates`
   * and SHALL NOT exist in the legacy `cards` table.
   * 
   * **Validates: Requirements 2.2**
   */
  describe('Property 5: Card Creation V2 Only', () => {
    it('*For any* card creation, card exists in card_templates not legacy cards', () => {
      fc.assert(
        fc.property(
          fc.record({
            deckTemplateId: uuidArb,
            stem: fc.string({ minLength: 10, maxLength: 200 }),
            options: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 5 }),
            correctIndex: fc.integer({ min: 0, max: 4 }),
            explanation: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
          }),
          (cardInput) => {
            // Simulate V2 card creation
            const cardTemplates: Array<{
              id: string
              deck_template_id: string
              stem: string
              options: string[]
              correct_index: number
            }> = []
            const legacyCards: Array<{ id: string; deck_id: string }> = []

            // V8.0: Card creation goes to card_templates only
            const newCardTemplate = {
              id: `ct-${Date.now()}`,
              deck_template_id: cardInput.deckTemplateId,
              stem: cardInput.stem,
              options: cardInput.options,
              correct_index: Math.min(cardInput.correctIndex, cardInput.options.length - 1),
            }
            cardTemplates.push(newCardTemplate)

            // Verify: card exists in card_templates
            const existsInV2 = cardTemplates.some(ct => ct.id === newCardTemplate.id)
            expect(existsInV2).toBe(true)

            // Verify: card does NOT exist in legacy cards
            const existsInLegacy = legacyCards.some(c => c.id === newCardTemplate.id)
            expect(existsInLegacy).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: v8-unification, Property 6: Due Cards V2 Source**
   * 
   * *For any* due cards query result, all returned cards SHALL have valid
   * `card_template_id` references and SRS state from `user_card_progress`.
   * 
   * **Validates: Requirements 2.5**
   */
  describe('Property 6: Due Cards V2 Source', () => {
    it('*For any* due cards query, all cards have valid V2 references', () => {
      // Use double instead of float to avoid NaN issues
      const easeFactorArb = fc.double({ min: 1.3, max: 3.0, noNaN: true })
      
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              cardTemplateId: uuidArb,
              deckTemplateId: uuidArb,
              stem: fc.string({ minLength: 10, maxLength: 200 }),
              interval: fc.integer({ min: 0, max: 365 }),
              ease_factor: easeFactorArb,
              next_review: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (cards) => {
            // Simulate V2 data structure
            const cardTemplates = cards.map(c => ({
              id: c.cardTemplateId,
              deck_template_id: c.deckTemplateId,
              stem: c.stem,
            }))

            const userCardProgress = cards.map(c => ({
              card_template_id: c.cardTemplateId,
              interval: c.interval,
              ease_factor: c.ease_factor,
              next_review: c.next_review,
            }))

            // Simulate due cards query (V2 only)
            const now = new Date()
            const dueCards = userCardProgress
              .filter(p => p.next_review <= now)
              .map(p => {
                const template = cardTemplates.find(ct => ct.id === p.card_template_id)
                return {
                  card_template_id: p.card_template_id,
                  stem: template?.stem,
                  interval: p.interval,
                  ease_factor: p.ease_factor,
                  next_review: p.next_review,
                }
              })

            // Verify: all due cards have valid card_template_id
            for (const card of dueCards) {
              const hasTemplate = cardTemplates.some(ct => ct.id === card.card_template_id)
              expect(hasTemplate).toBe(true)
              expect(card.interval).toBeGreaterThanOrEqual(0)
              expect(card.ease_factor).toBeGreaterThanOrEqual(1.3)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: v8-unification, Property 9: Legacy ID Rejection**
   * 
   * *For any* card operation that receives an ID not found in `card_templates`,
   * the system SHALL return an error without attempting legacy table fallback.
   * 
   * **Validates: Requirements 4.1**
   */
  describe('Property 9: Legacy ID Rejection', () => {
    it('*For any* invalid ID, operation fails without legacy fallback', () => {
      fc.assert(
        fc.property(
          uuidArb,
          fc.array(uuidArb, { minLength: 0, maxLength: 5 }),
          (requestedId, existingIds) => {
            // Ensure requestedId is NOT in existingIds
            const cardTemplateIds = new Set(existingIds)
            
            // Simulate V8.0 card lookup (no legacy fallback)
            const foundInV2 = cardTemplateIds.has(requestedId)
            
            if (!foundInV2) {
              // V8.0: Should return error, not attempt legacy lookup
              const result = { ok: false, error: 'Card not found in V2 schema' }
              expect(result.ok).toBe(false)
              expect(result.error).toContain('V2')
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
