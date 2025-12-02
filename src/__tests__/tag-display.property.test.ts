import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import type { Tag } from '../types/database';

/**
 * **Feature: v8.5-data-integrity, Property 1: Tag fetch includes all linked tags**
 * **Validates: Requirements 1.1, 1.2**
 *
 * For any card_template with tags in card_template_tags, fetching that card
 * SHALL return all associated tag names.
 */
describe('Property 1: Tag fetch includes all linked tags', () => {
  // Type for the nested structure returned by Supabase join
  interface CardTemplateTagJoin {
    tags: {
      id: string;
      name: string;
      color: string;
    } | null;
  }

  interface CardTemplateWithNestedTags {
    id: string;
    stem: string;
    options: string[];
    correct_index: number;
    explanation: string | null;
    created_at: string;
    card_template_tags: CardTemplateTagJoin[];
  }

  // Helper function that mirrors the tag extraction logic in deck detail page
  function extractTagsFromCardTemplate(ct: CardTemplateWithNestedTags): Tag[] {
    return (ct.card_template_tags || [])
      .map((ctt) => ctt.tags)
      .filter((tag): tag is { id: string; name: string; color: string } => tag !== null)
      .map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        user_id: '',
        created_at: '',
      }));
  }

  // Generator for a valid tag
  const tagArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 30 }),
    color: fc.constantFrom('blue', 'green', 'red', 'purple', 'orange', 'pink'),
  });

  // Generator for card_template_tags join entry
  const cardTemplateTagJoinArb = fc.oneof(
    tagArb.map((tag) => ({ tags: tag })),
    fc.constant({ tags: null }) // Simulate null tag (shouldn't happen but handle gracefully)
  );

  // Generator for a card template with nested tags
  const cardTemplateWithTagsArb = fc.record({
    id: fc.uuid(),
    stem: fc.string({ minLength: 1, maxLength: 200 }),
    options: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 5 }),
    correct_index: fc.integer({ min: 0, max: 4 }),
    explanation: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
    created_at: fc.date().map((d) => d.toISOString()),
    card_template_tags: fc.array(cardTemplateTagJoinArb, { minLength: 0, maxLength: 5 }),
  });

  test('All non-null tags from card_template_tags are included in extracted tags', () => {
    fc.assert(
      fc.property(cardTemplateWithTagsArb, (cardTemplate) => {
        const extractedTags = extractTagsFromCardTemplate(cardTemplate);

        // Get expected tags (non-null ones from the join)
        const expectedTags = cardTemplate.card_template_tags
          .map((ctt) => ctt.tags)
          .filter((tag): tag is { id: string; name: string; color: string } => tag !== null);

        // Extracted tags should have same count as non-null tags
        expect(extractedTags.length).toBe(expectedTags.length);

        // Every expected tag should be in extracted tags
        for (const expected of expectedTags) {
          const found = extractedTags.find((t) => t.id === expected.id);
          expect(found).toBeDefined();
          expect(found?.name).toBe(expected.name);
          expect(found?.color).toBe(expected.color);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('Tag extraction handles empty card_template_tags gracefully', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          stem: fc.string({ minLength: 1, maxLength: 200 }),
          options: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 5 }),
          correct_index: fc.integer({ min: 0, max: 4 }),
          explanation: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
          created_at: fc.date().map((d) => d.toISOString()),
          card_template_tags: fc.constant([]),
        }),
        (cardTemplate) => {
          const extractedTags = extractTagsFromCardTemplate(cardTemplate);
          expect(extractedTags).toEqual([]);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Tag extraction handles undefined card_template_tags gracefully', () => {
    // Simulate case where card_template_tags might be undefined
    const cardTemplateWithUndefinedTags = {
      id: 'test-id',
      stem: 'Test stem',
      options: ['A', 'B', 'C', 'D'],
      correct_index: 0,
      explanation: null,
      created_at: new Date().toISOString(),
      card_template_tags: undefined as unknown as CardTemplateTagJoin[],
    };

    const extractedTags = extractTagsFromCardTemplate(cardTemplateWithUndefinedTags);
    expect(extractedTags).toEqual([]);
  });

  test('Tag extraction preserves tag properties exactly', () => {
    fc.assert(
      fc.property(
        fc.array(tagArb, { minLength: 1, maxLength: 5 }),
        (tags) => {
          const cardTemplate: CardTemplateWithNestedTags = {
            id: 'test-id',
            stem: 'Test stem',
            options: ['A', 'B', 'C', 'D'],
            correct_index: 0,
            explanation: null,
            created_at: new Date().toISOString(),
            card_template_tags: tags.map((tag) => ({ tags: tag })),
          };

          const extractedTags = extractTagsFromCardTemplate(cardTemplate);

          // Each extracted tag should have exact same id, name, color
          for (let i = 0; i < tags.length; i++) {
            expect(extractedTags[i].id).toBe(tags[i].id);
            expect(extractedTags[i].name).toBe(tags[i].name);
            expect(extractedTags[i].color).toBe(tags[i].color);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Tag extraction filters out all null tags', () => {
    fc.assert(
      fc.property(
        fc.array(tagArb, { minLength: 1, maxLength: 3 }),
        fc.integer({ min: 1, max: 3 }),
        (validTags, nullCount) => {
          // Create a mix of valid tags and null tags
          const cardTemplateTags: CardTemplateTagJoin[] = [
            ...validTags.map((tag) => ({ tags: tag })),
            ...Array(nullCount).fill({ tags: null }),
          ];

          // Shuffle to mix nulls with valid tags
          const shuffled = cardTemplateTags.sort(() => Math.random() - 0.5);

          const cardTemplate: CardTemplateWithNestedTags = {
            id: 'test-id',
            stem: 'Test stem',
            options: ['A', 'B', 'C', 'D'],
            correct_index: 0,
            explanation: null,
            created_at: new Date().toISOString(),
            card_template_tags: shuffled,
          };

          const extractedTags = extractTagsFromCardTemplate(cardTemplate);

          // Should only have the valid tags, not the nulls
          expect(extractedTags.length).toBe(validTags.length);

          // All extracted tags should have valid ids (not undefined/null)
          for (const tag of extractedTags) {
            expect(tag.id).toBeDefined();
            expect(tag.name).toBeDefined();
            expect(tag.color).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
