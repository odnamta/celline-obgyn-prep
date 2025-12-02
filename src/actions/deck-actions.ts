'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server'
import { createDeckSchema } from '@/lib/validations'
import type { ActionResult } from '@/types/actions'

/**
 * V8.0: Server Action for creating a new deck.
 * Creates deck_template and auto-subscribes author via user_decks.
 * Requirements: 2.1, 9.3, V8 2.2
 */
export async function createDeckAction(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const rawData = { title: formData.get('title') }

  const validationResult = createDeckSchema.safeParse(rawData)
  if (!validationResult.success) {
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of validationResult.error.issues) {
      const field = issue.path[0] as string
      if (!fieldErrors[field]) fieldErrors[field] = []
      fieldErrors[field].push(issue.message)
    }
    return { success: false, error: 'Validation failed', fieldErrors }
  }

  const user = await getUser()
  if (!user) {
    return { success: false, error: 'Authentication required' }
  }

  const { title } = validationResult.data
  const supabase = await createSupabaseServerClient()

  // V8.0: Create deck_template instead of legacy deck
  const { data: deckTemplate, error: createError } = await supabase
    .from('deck_templates')
    .insert({ title, author_id: user.id, visibility: 'private' })
    .select()
    .single()

  if (createError) {
    return { success: false, error: createError.message }
  }

  // V8.0: Auto-subscribe author via user_decks
  await supabase.from('user_decks').insert({
    user_id: user.id,
    deck_template_id: deckTemplate.id,
    is_active: true,
  })

  revalidatePath('/dashboard')
  return { success: true, data: deckTemplate }
}

/**
 * V8.0: Server Action for deleting a deck.
 * Deletes deck_template (cascade handles card_templates).
 * Requirements: 2.3, 9.3, V8 2.4
 */
export async function deleteDeckAction(deckId: string): Promise<ActionResult> {
  if (!deckId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deckId)) {
    return { success: false, error: 'Invalid deck ID' }
  }

  const user = await getUser()
  if (!user) {
    return { success: false, error: 'Authentication required' }
  }

  const supabase = await createSupabaseServerClient()

  // V8.0: Delete deck_template (cascade handles card_templates, user_decks)
  const { error } = await supabase
    .from('deck_templates')
    .delete()
    .eq('id', deckId)
    .eq('author_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}


/**
 * V8.0: Server Action for fetching all user's deck_templates.
 * Queries user_decks joined with deck_templates.
 * Requirements: V8 2.1
 */
export async function getUserDecks(): Promise<{ id: string; title: string }[]> {
  const user = await getUser()
  if (!user) return []

  const supabase = await createSupabaseServerClient()

  // V8.0: Query user_decks joined with deck_templates
  const { data: userDecks, error } = await supabase
    .from('user_decks')
    .select(`deck_template_id, deck_templates!inner(id, title)`)
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (error) {
    console.error('Failed to fetch user decks:', error)
    return []
  }

  return (userDecks || []).map(ud => {
    const dt = ud.deck_templates as unknown as { id: string; title: string }
    return { id: dt.id, title: dt.title }
  }).sort((a, b) => a.title.localeCompare(b.title))
}


// ============================================
// V6.4: Shared Library V2 Functions
// ============================================

import type { DeckTemplate, DeckTemplateWithDueCount } from '@/types/database'

/**
 * Fetches user's deck_templates (authored + subscribed via user_decks).
 * Includes due count from user_card_progress.
 * 
 * V6.4: Shared Library Read Path
 */
export async function getDeckTemplates(): Promise<DeckTemplateWithDueCount[]> {
  const user = await getUser()
  if (!user) {
    return []
  }

  const supabase = await createSupabaseServerClient()
  const now = new Date().toISOString()

  // Get user's subscribed deck_templates via user_decks
  const { data: userDecks, error: userDecksError } = await supabase
    .from('user_decks')
    .select(`
      deck_template_id,
      deck_templates!inner(*)
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (userDecksError) {
    console.error('Failed to fetch deck templates:', userDecksError)
    return []
  }

  if (!userDecks || userDecks.length === 0) {
    return []
  }

  // Get due counts for each deck_template
  const deckTemplateIds = userDecks.map(ud => ud.deck_template_id)
  
  // Get all card_templates in user's decks
  const { data: cardTemplates, error: ctError } = await supabase
    .from('card_templates')
    .select('id, deck_template_id')
    .in('deck_template_id', deckTemplateIds)

  if (ctError) {
    console.error('Failed to fetch card templates:', ctError)
  }

  // Create map of card_template_id -> deck_template_id
  const cardToDeckMap = new Map<string, string>()
  for (const ct of cardTemplates || []) {
    cardToDeckMap.set(ct.id, ct.deck_template_id)
  }

  // Get due progress records
  const cardTemplateIdList = Array.from(cardToDeckMap.keys())
  const { data: dueProgress, error: dueError } = await supabase
    .from('user_card_progress')
    .select('card_template_id')
    .eq('user_id', user.id)
    .lte('next_review', now)
    .eq('suspended', false)
    .in('card_template_id', cardTemplateIdList)

  if (dueError) {
    console.error('Failed to fetch due counts:', dueError)
  }

  // Build due count map
  const dueCountMap = new Map<string, number>()
  for (const record of dueProgress || []) {
    const deckTemplateId = cardToDeckMap.get(record.card_template_id)
    if (deckTemplateId) {
      dueCountMap.set(deckTemplateId, (dueCountMap.get(deckTemplateId) || 0) + 1)
    }
  }

  // Map to DeckTemplateWithDueCount
  return userDecks.map(ud => {
    const dt = ud.deck_templates as unknown as DeckTemplate
    return {
      ...dt,
      due_count: dueCountMap.get(dt.id) || 0,
    }
  })
}

/**
 * Fetches user's deck_templates for dropdown selection.
 * Simpler version without due counts.
 * 
 * V6.4: Used by ConfigureSessionModal for deck selection.
 */
export async function getUserDeckTemplates(): Promise<{ id: string; title: string }[]> {
  const user = await getUser()
  if (!user) {
    return []
  }

  const supabase = await createSupabaseServerClient()

  const { data: userDecks, error } = await supabase
    .from('user_decks')
    .select(`
      deck_template_id,
      deck_templates!inner(id, title)
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (error) {
    console.error('Failed to fetch user deck templates:', error)
    return []
  }

  return (userDecks || []).map(ud => {
    const dt = ud.deck_templates as unknown as { id: string; title: string }
    return { id: dt.id, title: dt.title }
  }).sort((a, b) => a.title.localeCompare(b.title))
}

/**
 * Creates a new deck_template and auto-subscribes the author.
 * 
 * V6.4: Write Path
 */
export async function createDeckTemplateAction(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const rawData = {
    title: formData.get('title'),
  }

  const validationResult = createDeckSchema.safeParse(rawData)
  
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

  const user = await getUser()
  if (!user) {
    return { success: false, error: 'Authentication required' }
  }

  const { title } = validationResult.data
  const supabase = await createSupabaseServerClient()

  // Create deck_template
  const { data: deckTemplate, error: createError } = await supabase
    .from('deck_templates')
    .insert({
      title,
      author_id: user.id,
      visibility: 'private',
    })
    .select()
    .single()

  if (createError) {
    return { success: false, error: createError.message }
  }

  // Auto-subscribe author via user_decks
  const { error: subscribeError } = await supabase
    .from('user_decks')
    .insert({
      user_id: user.id,
      deck_template_id: deckTemplate.id,
      is_active: true,
    })

  if (subscribeError) {
    console.error('Failed to auto-subscribe author:', subscribeError)
    // Don't fail the whole operation, deck was created
  }

  revalidatePath('/dashboard')

  return { success: true, data: deckTemplate }
}


// ============================================
// V8.6: Deck Renaming
// ============================================

/**
 * V8.6: Server Action for updating a deck's title.
 * Only the author can rename their deck.
 * 
 * Requirements: 3.2, 3.3
 * 
 * @param deckId - The deck_template ID to update
 * @param newTitle - The new title (1-100 characters)
 * @returns ActionResult with success/error
 */
export async function updateDeckTitle(
  deckId: string,
  newTitle: string
): Promise<ActionResult> {
  // Validate deck ID format
  if (!deckId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deckId)) {
    return { success: false, error: 'Invalid deck ID' }
  }

  // Validate title length (1-100 characters)
  const trimmedTitle = newTitle.trim()
  if (!trimmedTitle || trimmedTitle.length < 1) {
    return { success: false, error: 'Title cannot be empty' }
  }
  if (trimmedTitle.length > 100) {
    return { success: false, error: 'Title must be at most 100 characters' }
  }

  const user = await getUser()
  if (!user) {
    return { success: false, error: 'Authentication required' }
  }

  const supabase = await createSupabaseServerClient()

  // V8.6: Fetch deck to verify author
  const { data: deckTemplate, error: fetchError } = await supabase
    .from('deck_templates')
    .select('id, author_id')
    .eq('id', deckId)
    .single()

  if (fetchError || !deckTemplate) {
    return { success: false, error: 'Deck not found' }
  }

  // V8.6: Check user is author
  if (deckTemplate.author_id !== user.id) {
    return { success: false, error: 'Only the author can rename this deck' }
  }

  // V8.6: Update the title
  const { error: updateError } = await supabase
    .from('deck_templates')
    .update({ title: trimmedTitle })
    .eq('id', deckId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Revalidate paths
  revalidatePath(`/decks/${deckId}`)
  revalidatePath('/dashboard')

  return { success: true, data: { title: trimmedTitle } }
}
