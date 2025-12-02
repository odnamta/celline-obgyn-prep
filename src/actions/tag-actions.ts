'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server'
import { getCategoryColor } from '@/lib/tag-colors'
import type { Tag, TagCategory } from '@/types/database'

/**
 * Tag Server Actions
 * Requirements: V5 Feature Set 1 - Tagging System
 * V9: Added category support with enforced colors
 */

// V9: Tag category schema
const tagCategorySchema = z.enum(['source', 'topic', 'concept']).default('concept')

// Validation schemas
const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50, 'Tag name too long'),
  category: tagCategorySchema,
})

const updateTagSchema = z.object({
  tagId: z.string().uuid('Invalid tag ID'),
  name: z.string().min(1, 'Tag name is required').max(50, 'Tag name too long'),
  category: tagCategorySchema.optional(),
})

// Result types
export type TagActionResult =
  | { ok: true; tag?: Tag }
  | { ok: false; error: string }

/**
 * Create a new tag for the current user.
 * V9: Category defaults to 'concept', color is enforced by category.
 * Validates uniqueness of tag name per user.
 * Req: 1.1, 1.2, V9-1.1, V9-1.2, V9-1.3, V9-1.4, V9-1.5
 */
export async function createTag(
  name: string,
  category: TagCategory = 'concept'
): Promise<TagActionResult> {
  const validation = createTagSchema.safeParse({ name, category })
  if (!validation.success) {
    return { ok: false, error: validation.error.issues[0].message }
  }

  const user = await getUser()
  if (!user) {
    return { ok: false, error: 'Authentication required' }
  }

  const supabase = await createSupabaseServerClient()

  // Check for duplicate name (case-insensitive)
  const { data: existing } = await supabase
    .from('tags')
    .select('id')
    .eq('user_id', user.id)
    .ilike('name', name.trim())
    .single()

  if (existing) {
    return { ok: false, error: `Tag "${name}" already exists` }
  }

  // V9: Enforce color based on category
  const color = getCategoryColor(category)

  // Create the tag with category and enforced color
  const { data: tag, error } = await supabase
    .from('tags')
    .insert({
      user_id: user.id,
      name: name.trim(),
      color,
      category,
    })
    .select()
    .single()

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true, tag }
}

/**
 * Get all tags for the current user.
 * Req: 1.1
 */
export async function getUserTags(): Promise<Tag[]> {
  const user = await getUser()
  if (!user) {
    return []
  }

  const supabase = await createSupabaseServerClient()

  const { data: tags } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  return tags || []
}

/**
 * Update an existing tag.
 * V9: If category is changed, color is automatically updated to match.
 * Req: 1.1, 1.2, V9-3.2, V9-3.5
 */
export async function updateTag(
  tagId: string,
  name: string,
  category?: TagCategory
): Promise<TagActionResult> {
  const validation = updateTagSchema.safeParse({ tagId, name, category })
  if (!validation.success) {
    return { ok: false, error: validation.error.issues[0].message }
  }

  const user = await getUser()
  if (!user) {
    return { ok: false, error: 'Authentication required' }
  }

  const supabase = await createSupabaseServerClient()

  // Verify ownership and get current tag
  const { data: existingTag } = await supabase
    .from('tags')
    .select('id, category')
    .eq('id', tagId)
    .eq('user_id', user.id)
    .single()

  if (!existingTag) {
    return { ok: false, error: 'Tag not found' }
  }

  // Check for duplicate name (excluding current tag, case-insensitive)
  const { data: duplicate } = await supabase
    .from('tags')
    .select('id')
    .eq('user_id', user.id)
    .ilike('name', name.trim())
    .neq('id', tagId)
    .single()

  if (duplicate) {
    return { ok: false, error: `Tag "${name}" already exists` }
  }

  // V9: Determine final category and enforce color
  const finalCategory = category ?? existingTag.category
  const color = getCategoryColor(finalCategory)

  // Update the tag with category and enforced color
  const { data: tag, error } = await supabase
    .from('tags')
    .update({ name: name.trim(), category: finalCategory, color })
    .eq('id', tagId)
    .select()
    .single()

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true, tag }
}

/**
 * Delete a tag. Cascades to card_tags automatically.
 * Req: 1.6
 */
export async function deleteTag(tagId: string): Promise<TagActionResult> {
  if (!tagId) {
    return { ok: false, error: 'Tag ID is required' }
  }

  const user = await getUser()
  if (!user) {
    return { ok: false, error: 'Authentication required' }
  }

  const supabase = await createSupabaseServerClient()

  // Verify ownership
  const { data: existingTag } = await supabase
    .from('tags')
    .select('id')
    .eq('id', tagId)
    .eq('user_id', user.id)
    .single()

  if (!existingTag) {
    return { ok: false, error: 'Tag not found' }
  }

  // Delete the tag (cascades to card_tags)
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', tagId)

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true }
}


// ============================================
// Card-Tag Association Actions
// ============================================

/**
 * Assign tags to a card. Replaces existing tags.
 * Req: 1.3
 */
export async function assignTagsToCard(
  cardId: string,
  tagIds: string[]
): Promise<TagActionResult> {
  if (!cardId) {
    return { ok: false, error: 'Card ID is required' }
  }

  const user = await getUser()
  if (!user) {
    return { ok: false, error: 'Authentication required' }
  }

  const supabase = await createSupabaseServerClient()

  // Verify card ownership via deck
  const { data: card } = await supabase
    .from('cards')
    .select('id, deck_id, decks!inner(user_id)')
    .eq('id', cardId)
    .single()

  if (!card) {
    return { ok: false, error: 'Card not found' }
  }

  const deckData = card.decks as unknown as { user_id: string }
  if (deckData.user_id !== user.id) {
    return { ok: false, error: 'Access denied' }
  }

  // Remove existing tags
  await supabase
    .from('card_tags')
    .delete()
    .eq('card_id', cardId)

  // Add new tags (if any)
  if (tagIds.length > 0) {
    const cardTags = tagIds.map((tagId) => ({
      card_id: cardId,
      tag_id: tagId,
    }))

    const { error } = await supabase
      .from('card_tags')
      .insert(cardTags)

    if (error) {
      return { ok: false, error: error.message }
    }
  }

  // Revalidate deck page
  revalidatePath(`/decks/${card.deck_id}`)

  return { ok: true }
}

/**
 * Remove a single tag from a card.
 * Req: 1.4
 */
export async function removeTagFromCard(
  cardId: string,
  tagId: string
): Promise<TagActionResult> {
  if (!cardId || !tagId) {
    return { ok: false, error: 'Card ID and Tag ID are required' }
  }

  const user = await getUser()
  if (!user) {
    return { ok: false, error: 'Authentication required' }
  }

  const supabase = await createSupabaseServerClient()

  // Verify card ownership via deck
  const { data: card } = await supabase
    .from('cards')
    .select('id, deck_id, decks!inner(user_id)')
    .eq('id', cardId)
    .single()

  if (!card) {
    return { ok: false, error: 'Card not found' }
  }

  const deckData = card.decks as unknown as { user_id: string }
  if (deckData.user_id !== user.id) {
    return { ok: false, error: 'Access denied' }
  }

  // Remove the tag association
  const { error } = await supabase
    .from('card_tags')
    .delete()
    .eq('card_id', cardId)
    .eq('tag_id', tagId)

  if (error) {
    return { ok: false, error: error.message }
  }

  // Revalidate deck page
  revalidatePath(`/decks/${card.deck_id}`)

  return { ok: true }
}

/**
 * Get all tags for a specific card.
 * Req: 1.3
 */
export async function getCardTags(cardId: string): Promise<Tag[]> {
  if (!cardId) {
    return []
  }

  const user = await getUser()
  if (!user) {
    return []
  }

  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('card_tags')
    .select('tags(*)')
    .eq('card_id', cardId)

  if (!data) {
    return []
  }

  // Extract tags from the join result
  return data
    .map((row) => row.tags as unknown as Tag)
    .filter((tag): tag is Tag => tag !== null)
}


// ============================================
// V9.1: Bulk Tagging Actions
// ============================================

/**
 * V9.1: Result type for bulk tag operations
 */
export type BulkTagResult =
  | { ok: true; taggedCount: number }
  | { ok: false; error: string }

/**
 * V9.1: Add a tag to multiple cards in bulk.
 * Batches inserts in chunks of 100 to prevent timeout.
 * Uses ON CONFLICT DO NOTHING for idempotent behavior.
 * 
 * Requirements: 2.3, 2.4, 2.6, 2.7
 * 
 * @param cardIds - Array of card_template IDs to tag
 * @param tagId - The tag ID to apply
 * @returns BulkTagResult with count of newly tagged cards
 */
export async function bulkAddTagToCards(
  cardIds: string[],
  tagId: string
): Promise<BulkTagResult> {
  if (!cardIds.length) {
    return { ok: false, error: 'No cards selected' }
  }

  if (!tagId) {
    return { ok: false, error: 'Tag ID is required' }
  }

  const user = await getUser()
  if (!user) {
    return { ok: false, error: 'Authentication required' }
  }

  const supabase = await createSupabaseServerClient()

  // Verify tag exists and belongs to user
  const { data: tag, error: tagError } = await supabase
    .from('tags')
    .select('id')
    .eq('id', tagId)
    .eq('user_id', user.id)
    .single()

  if (tagError || !tag) {
    return { ok: false, error: 'Tag not found' }
  }

  // Verify user is author of all cards via deck_template.author_id
  // Fetch all card_templates with their deck_template author info
  const { data: cardTemplates, error: fetchError } = await supabase
    .from('card_templates')
    .select('id, deck_template_id, deck_templates!inner(author_id)')
    .in('id', cardIds)

  if (fetchError || !cardTemplates) {
    return { ok: false, error: 'Could not verify card ownership' }
  }

  // Check that we found all requested cards
  if (cardTemplates.length !== cardIds.length) {
    return { ok: false, error: 'Some cards were not found' }
  }

  // Check all cards belong to user (author check)
  const unauthorized = cardTemplates.some((ct) => {
    const deckData = ct.deck_templates as unknown as { author_id: string }
    return deckData.author_id !== user.id
  })

  if (unauthorized) {
    return { ok: false, error: 'Only the author can tag these cards' }
  }

  // Batch inserts in chunks of 100 to prevent timeout
  const BATCH_SIZE = 100
  let totalTagged = 0

  for (let i = 0; i < cardIds.length; i += BATCH_SIZE) {
    const batch = cardIds.slice(i, i + BATCH_SIZE)
    const cardTagRows = batch.map((cardId) => ({
      card_template_id: cardId,
      tag_id: tagId,
    }))

    // Use upsert with ON CONFLICT DO NOTHING for idempotence
    const { error: insertError, count } = await supabase
      .from('card_template_tags')
      .upsert(cardTagRows, { 
        onConflict: 'card_template_id,tag_id',
        ignoreDuplicates: true,
        count: 'exact'
      })

    if (insertError) {
      console.error('Bulk tag insert error:', insertError)
      return { ok: false, error: 'Failed to tag cards. Please try again.' }
    }

    totalTagged += count || 0
  }

  // Revalidate affected deck pages
  const deckIds = [...new Set(cardTemplates.map((ct) => ct.deck_template_id))]
  for (const deckId of deckIds) {
    revalidatePath(`/decks/${deckId}`)
  }

  return { ok: true, taggedCount: totalTagged }
}
