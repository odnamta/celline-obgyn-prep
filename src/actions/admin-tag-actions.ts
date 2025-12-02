'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server'
import { getCategoryColor } from '@/lib/tag-colors'
import type { Tag, TagCategory } from '@/types/database'

/**
 * Admin Tag Server Actions
 * V9: Tag Manager functionality for category management and merging
 * Requirements: V9-3.2, V9-3.3, V9-3.4, V9-3.5
 */

// Validation schemas
const updateCategorySchema = z.object({
  tagId: z.string().uuid('Invalid tag ID'),
  category: z.enum(['source', 'topic', 'concept']),
})

const mergeTagsSchema = z.object({
  sourceTagId: z.string().uuid('Invalid source tag ID'),
  targetTagId: z.string().uuid('Invalid target tag ID'),
})

// Result types
export type AdminTagActionResult =
  | { ok: true; tag?: Tag }
  | { ok: false; error: string }

export type MergeTagsResult =
  | { ok: true; mergedCount: number }
  | { ok: false; error: string }

export interface TagsByCategory {
  source: Tag[]
  topic: Tag[]
  concept: Tag[]
}

/**
 * Update a tag's category and automatically update its color.
 * V9: Category change triggers color enforcement.
 * Req: V9-3.2, V9-3.5
 */
export async function updateTagCategory(
  tagId: string,
  newCategory: TagCategory
): Promise<AdminTagActionResult> {
  const validation = updateCategorySchema.safeParse({ tagId, category: newCategory })
  if (!validation.success) {
    return { ok: false, error: validation.error.issues[0].message }
  }

  const user = await getUser()
  if (!user) {
    return { ok: false, error: 'Authentication required' }
  }

  const supabase = await createSupabaseServerClient()

  // Verify ownership
  const { data: existingTag } = await supabase
    .from('tags')
    .select('id, category')
    .eq('id', tagId)
    .eq('user_id', user.id)
    .single()

  if (!existingTag) {
    return { ok: false, error: 'Tag not found' }
  }

  // V9: Enforce color based on new category
  const newColor = getCategoryColor(newCategory)

  // Update category and color atomically
  const { data: tag, error } = await supabase
    .from('tags')
    .update({ category: newCategory, color: newColor })
    .eq('id', tagId)
    .select()
    .single()

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/tags')
  return { ok: true, tag }
}

/**
 * Merge two tags: transfer all associations from source to target, then delete source.
 * V9: Preserves all card-tag relationships.
 * Req: V9-3.3, V9-3.4
 */
export async function mergeTags(
  sourceTagId: string,
  targetTagId: string
): Promise<MergeTagsResult> {
  const validation = mergeTagsSchema.safeParse({ sourceTagId, targetTagId })
  if (!validation.success) {
    return { ok: false, error: validation.error.issues[0].message }
  }

  if (sourceTagId === targetTagId) {
    return { ok: false, error: 'Cannot merge a tag with itself' }
  }

  const user = await getUser()
  if (!user) {
    return { ok: false, error: 'Authentication required' }
  }

  const supabase = await createSupabaseServerClient()

  // Verify ownership of both tags
  const { data: sourcetag } = await supabase
    .from('tags')
    .select('id, name')
    .eq('id', sourceTagId)
    .eq('user_id', user.id)
    .single()

  const { data: targetTag } = await supabase
    .from('tags')
    .select('id, name')
    .eq('id', targetTagId)
    .eq('user_id', user.id)
    .single()

  if (!sourcetag || !targetTag) {
    return { ok: false, error: 'One or both tags not found' }
  }

  // Get all card_template_tags associations for source tag
  const { data: sourceAssociations } = await supabase
    .from('card_template_tags')
    .select('card_template_id')
    .eq('tag_id', sourceTagId)

  let mergedCount = 0

  if (sourceAssociations && sourceAssociations.length > 0) {
    // For each association, check if target already has it
    for (const assoc of sourceAssociations) {
      const { data: existing } = await supabase
        .from('card_template_tags')
        .select('card_template_id')
        .eq('card_template_id', assoc.card_template_id)
        .eq('tag_id', targetTagId)
        .single()

      if (!existing) {
        // Transfer association to target tag
        await supabase
          .from('card_template_tags')
          .update({ tag_id: targetTagId })
          .eq('card_template_id', assoc.card_template_id)
          .eq('tag_id', sourceTagId)
        mergedCount++
      } else {
        // Delete duplicate association
        await supabase
          .from('card_template_tags')
          .delete()
          .eq('card_template_id', assoc.card_template_id)
          .eq('tag_id', sourceTagId)
      }
    }
  }

  // Also handle legacy card_tags table
  const { data: legacyAssociations } = await supabase
    .from('card_tags')
    .select('card_id')
    .eq('tag_id', sourceTagId)

  if (legacyAssociations && legacyAssociations.length > 0) {
    for (const assoc of legacyAssociations) {
      const { data: existing } = await supabase
        .from('card_tags')
        .select('card_id')
        .eq('card_id', assoc.card_id)
        .eq('tag_id', targetTagId)
        .single()

      if (!existing) {
        await supabase
          .from('card_tags')
          .update({ tag_id: targetTagId })
          .eq('card_id', assoc.card_id)
          .eq('tag_id', sourceTagId)
        mergedCount++
      } else {
        await supabase
          .from('card_tags')
          .delete()
          .eq('card_id', assoc.card_id)
          .eq('tag_id', sourceTagId)
      }
    }
  }

  // Delete the source tag
  const { error: deleteError } = await supabase
    .from('tags')
    .delete()
    .eq('id', sourceTagId)

  if (deleteError) {
    return { ok: false, error: deleteError.message }
  }

  revalidatePath('/admin/tags')
  return { ok: true, mergedCount }
}

/**
 * Get all tags grouped by category.
 * V9: Returns tags organized for the Tag Manager UI.
 * Req: V9-3.1
 */
export async function getTagsByCategory(): Promise<TagsByCategory> {
  const user = await getUser()
  if (!user) {
    return { source: [], topic: [], concept: [] }
  }

  const supabase = await createSupabaseServerClient()

  const { data: tags } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  if (!tags) {
    return { source: [], topic: [], concept: [] }
  }

  // Group by category
  return {
    source: tags.filter(t => t.category === 'source'),
    topic: tags.filter(t => t.category === 'topic'),
    concept: tags.filter(t => t.category === 'concept'),
  }
}

/**
 * Get the Golden List of official topics.
 * V9: Used by AI tagging to classify questions.
 * Req: V9-4.1
 */
export async function getGoldenTopics(): Promise<string[]> {
  const user = await getUser()
  if (!user) {
    return []
  }

  const supabase = await createSupabaseServerClient()

  const { data: topics } = await supabase
    .from('tags')
    .select('name')
    .eq('user_id', user.id)
    .eq('category', 'topic')
    .order('name')

  return topics?.map(t => t.name) || []
}

/**
 * Get the Golden List of official sources.
 * V9: Used by session presets.
 */
export async function getGoldenSources(): Promise<Tag[]> {
  const user = await getUser()
  if (!user) {
    return []
  }

  const supabase = await createSupabaseServerClient()

  const { data: sources } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', user.id)
    .eq('category', 'source')
    .order('name')

  return sources || []
}
