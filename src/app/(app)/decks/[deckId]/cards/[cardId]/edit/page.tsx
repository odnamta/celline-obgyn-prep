export const metadata = { title: 'Edit Card' }

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server'
import { EditCardForm } from '@/components/cards/EditCardForm'
import { resolveDeckId, resolveCardId } from '@/lib/legacy-redirect'
import type { Card } from '@/types/database'

interface EditCardPageProps {
  params: Promise<{ deckId: string; cardId: string }>
}

/**
 * V8.1: Edit Card Page - Server Component
 * Fetches card_template data and renders edit form.
 * Supports legacy ID redirect for old bookmarks.
 * Requirements: FR-2, V8 2.3, V8.1 Fix 1
 */
export default async function EditCardPage({ params }: EditCardPageProps) {
  const { deckId, cardId } = await params
  const user = await getUser()

  if (!user) {
    return null // Layout handles redirect
  }

  const supabase = await createSupabaseServerClient()

  // V8.1: Resolve deck and card IDs (supports legacy redirect)
  const resolvedDeck = await resolveDeckId(deckId, supabase)
  const resolvedCard = await resolveCardId(cardId, supabase)
  
  if (!resolvedDeck || !resolvedCard) {
    notFound()
  }
  
  // V8.1: Redirect if either was a legacy ID
  if (resolvedDeck.isLegacy || resolvedCard.isLegacy) {
    redirect(`/decks/${resolvedDeck.id}/cards/${resolvedCard.id}/edit`)
  }

  // Fetch card_template with deck_template ownership check
  const { data: cardTemplate, error } = await supabase
    .from('card_templates')
    .select('*, deck_templates!inner(author_id, title)')
    .eq('id', resolvedCard.id)
    .eq('deck_template_id', resolvedDeck.id)
    .single()

  if (error || !cardTemplate) {
    notFound()
  }

  // Verify ownership (author of deck_template)
  const deckData = cardTemplate.deck_templates as unknown as { author_id: string; title: string }
  if (deckData.author_id !== user.id) {
    notFound()
  }

  // Map card_template to Card format for EditCardForm compatibility
  const cardData: Card = {
    id: cardTemplate.id,
    deck_id: cardTemplate.deck_template_id,
    card_type: 'mcq',
    front: cardTemplate.stem,
    back: cardTemplate.explanation || '',
    stem: cardTemplate.stem,
    options: cardTemplate.options as string[],
    correct_index: cardTemplate.correct_index,
    explanation: cardTemplate.explanation,
    image_url: null,
    interval: 0,
    ease_factor: 2.5,
    next_review: new Date().toISOString(),
    created_at: cardTemplate.created_at,
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header with navigation */}
      <div className="mb-6">
        <Link
          href={`/decks/${resolvedDeck.id}`}
          className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
        >
          ← Back to {deckData.title}
        </Link>
      </div>

      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Edit {cardData.card_type === 'mcq' ? 'MCQ' : 'Flashcard'}
        </h1>
      </div>

      {/* Edit form */}
      <div className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm dark:shadow-none">
        <EditCardForm card={cardData} deckId={resolvedDeck.id} />
      </div>
    </div>
  )
}
