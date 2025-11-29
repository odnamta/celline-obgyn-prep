'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server'
import { createCardSchema } from '@/lib/validations'
import { getCardDefaults } from '@/lib/card-defaults'
import type { ActionResult } from '@/types/actions'

/**
 * Server Action for creating a new card.
 * Validates input with Zod and creates card with default SM-2 values.
 * Requirements: 3.1, 3.2, 9.3
 */
export async function createCardAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const rawData = {
    deckId: formData.get('deckId'),
    front: formData.get('front'),
    back: formData.get('back'),
    imageUrl: formData.get('imageUrl') || '',
  }

  // Server-side Zod validation (Requirement 9.3)
  const validationResult = createCardSchema.safeParse(rawData)
  
  if (!validationResult.success) {
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of validationResult.error.issues) {
      const field = issue.path[0] as string
      if (!fieldErrors[field]) {
        fieldErrors[field] = []
      }
      fieldErrors[field].push(issue.message)
    }
    return { success: false, error: 'Validation failed', fieldErrors }
  }

  // Get authenticated user
  const user = await getUser()
  if (!user) {
    return { success: false, error: 'Authentication required' }
  }

  const { deckId, front, back, imageUrl } = validationResult.data
  const supabase = await createSupabaseServerClient()

  // Verify user owns the deck (RLS will also enforce this)
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id')
    .eq('id', deckId)
    .eq('user_id', user.id)
    .single()

  if (deckError || !deck) {
    return { success: false, error: 'Deck not found or access denied' }
  }

  // Create new card with default SM-2 values (Requirement 3.1)
  const defaults = getCardDefaults()
  const { data, error } = await supabase
    .from('cards')
    .insert({
      deck_id: deckId,
      front,
      back,
      image_url: imageUrl || null,
      interval: defaults.interval,
      ease_factor: defaults.ease_factor,
      next_review: defaults.next_review.toISOString(),
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Revalidate deck details page to show new card
  revalidatePath(`/decks/${deckId}`)

  return { success: true, data }
}


/**
 * Result type for card update/delete operations
 */
export type CardActionResult = 
  | { ok: true }
  | { ok: false; error: string }

/**
 * Input type for updating a flashcard
 */
interface UpdateFlashcardInput {
  cardId: string
  type: 'flashcard'
  front: string
  back: string
  imageUrl?: string
}

/**
 * Input type for updating an MCQ
 */
interface UpdateMCQInput {
  cardId: string
  type: 'mcq'
  stem: string
  options: string[]
  correctIndex: number
  explanation?: string
}

export type UpdateCardInput = UpdateFlashcardInput | UpdateMCQInput

/**
 * Server Action for updating an existing card.
 * Handles both flashcard and MCQ types.
 * Requirements: FR-2, FR-4
 */
export async function updateCard(input: UpdateCardInput): Promise<CardActionResult> {
  // Get authenticated user
  const user = await getUser()
  if (!user) {
    return { ok: false, error: 'Authentication required' }
  }

  const supabase = await createSupabaseServerClient()

  // Fetch card and verify ownership via deck
  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select('id, deck_id, decks!inner(user_id)')
    .eq('id', input.cardId)
    .single()

  if (cardError || !card) {
    return { ok: false, error: 'Card not found' }
  }

  // Check ownership
  const deckData = card.decks as unknown as { user_id: string }
  if (deckData.user_id !== user.id) {
    return { ok: false, error: 'Access denied' }
  }

  // Build update payload based on card type
  let updatePayload: Record<string, unknown>

  if (input.type === 'flashcard') {
    // Validate flashcard fields
    if (!input.front?.trim() || !input.back?.trim()) {
      return { ok: false, error: 'Front and back are required' }
    }
    updatePayload = {
      front: input.front.trim(),
      back: input.back.trim(),
      image_url: input.imageUrl?.trim() || null,
    }
  } else {
    // Validate MCQ fields
    if (!input.stem?.trim()) {
      return { ok: false, error: 'Question stem is required' }
    }
    if (!input.options || input.options.length < 2) {
      return { ok: false, error: 'At least 2 options are required' }
    }
    if (input.correctIndex < 0 || input.correctIndex >= input.options.length) {
      return { ok: false, error: 'Invalid correct answer index' }
    }
    updatePayload = {
      stem: input.stem.trim(),
      options: input.options.map(o => o.trim()),
      correct_index: input.correctIndex,
      explanation: input.explanation?.trim() || null,
    }
  }

  // Update the card
  const { error: updateError } = await supabase
    .from('cards')
    .update(updatePayload)
    .eq('id', input.cardId)

  if (updateError) {
    return { ok: false, error: updateError.message }
  }

  // Revalidate deck page
  revalidatePath(`/decks/${card.deck_id}`)

  return { ok: true }
}

/**
 * Server Action for deleting a card.
 * Requirements: FR-3, FR-4
 */
export async function deleteCard(cardId: string): Promise<CardActionResult> {
  // Get authenticated user
  const user = await getUser()
  if (!user) {
    return { ok: false, error: 'Authentication required' }
  }

  const supabase = await createSupabaseServerClient()

  // Fetch card and verify ownership via deck
  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select('id, deck_id, decks!inner(user_id)')
    .eq('id', cardId)
    .single()

  if (cardError || !card) {
    return { ok: false, error: 'Card not found' }
  }

  // Check ownership
  const deckData = card.decks as unknown as { user_id: string }
  if (deckData.user_id !== user.id) {
    return { ok: false, error: 'Access denied' }
  }

  // Delete the card
  const { error: deleteError } = await supabase
    .from('cards')
    .delete()
    .eq('id', cardId)

  if (deleteError) {
    return { ok: false, error: deleteError.message }
  }

  // Revalidate deck page
  revalidatePath(`/decks/${card.deck_id}`)

  return { ok: true }
}
