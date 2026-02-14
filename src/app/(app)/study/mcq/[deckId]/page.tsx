export const metadata = { title: 'MCQ Study' }

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server'
import { MCQStudySession } from '@/components/study/MCQStudySession'
import { resolveDeckId } from '@/lib/legacy-redirect'
import type { MCQCard, CardTemplate, UserCardProgress } from '@/types/database'

interface MCQStudyPageProps {
  params: Promise<{ deckId: string }>
}

/**
 * V8.1: MCQ Study Page - React Server Component
 * Fetches due MCQ cards from user_card_progress joined with card_templates.
 * Supports legacy ID redirect for old bookmarks.
 * Requirements: 2.1, V8 2.5, V8.1 Fix 1
 */
export default async function MCQStudyPage({ params }: MCQStudyPageProps) {
  const { deckId } = await params
  const user = await getUser()

  if (!user) {
    return null // Layout handles redirect
  }

  const supabase = await createSupabaseServerClient()

  // V8.1: Resolve deck ID (supports legacy redirect)
  const resolved = await resolveDeckId(deckId, supabase)
  
  if (!resolved) {
    notFound()
  }
  
  // V8.1: Redirect if this was a legacy ID
  if (resolved.isLegacy) {
    redirect(`/study/mcq/${resolved.id}`)
  }

  // Fetch deck_template data
  const { data: deckTemplate, error: deckError } = await supabase
    .from('deck_templates')
    .select('id, title, author_id')
    .eq('id', resolved.id)
    .single()

  if (deckError || !deckTemplate) {
    notFound()
  }

  // V8.0: Verify user has access via user_decks subscription or is author
  const { data: userDeck } = await supabase
    .from('user_decks')
    .select('id')
    .eq('user_id', user.id)
    .eq('deck_template_id', deckId)
    .eq('is_active', true)
    .single()

  const isAuthor = deckTemplate.author_id === user.id
  if (!userDeck && !isAuthor) {
    notFound()
  }

  // V8.0: Fetch due MCQ cards from user_card_progress joined with card_templates
  const now = new Date().toISOString()
  const { data: dueProgress, error: cardsError } = await supabase
    .from('user_card_progress')
    .select(`
      *,
      card_templates!inner(*)
    `)
    .eq('user_id', user.id)
    .eq('card_templates.deck_template_id', deckId)
    .lte('next_review', now)
    .eq('suspended', false)
    .order('next_review', { ascending: true })

  // Map to MCQCard format for MCQStudySession compatibility
  const mcqCards: MCQCard[] = (dueProgress || [])
    .map(record => {
      const ct = record.card_templates as unknown as CardTemplate
      const progress = record as unknown as UserCardProgress
      return {
        id: ct.id,
        deck_id: ct.deck_template_id,
        card_type: 'mcq' as const,
        front: ct.stem,
        back: ct.explanation || '',
        stem: ct.stem,
        options: ct.options as string[],
        correct_index: ct.correct_index,
        explanation: ct.explanation,
        image_url: null as string | null,
        interval: progress.interval,
        ease_factor: progress.ease_factor,
        next_review: progress.next_review,
        created_at: ct.created_at,
      }
    })
    .filter(card => card.stem !== null && card.options !== null && card.correct_index !== null) as MCQCard[]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header with navigation */}
      <div className="mb-6">
        <Link
          href={`/decks/${deckId}`}
          className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
        >
          ← Back to Deck
        </Link>
      </div>

      {/* Deck title */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          MCQ Practice: {deckTemplate.title}
        </h1>
        {cardsError ? (
          <p className="text-red-600 dark:text-red-400">
            Error loading cards: {cardsError.message}
          </p>
        ) : (
          <p className="text-slate-600 dark:text-slate-400">
            {mcqCards.length} {mcqCards.length === 1 ? 'question' : 'questions'} due for review
          </p>
        )}
      </div>

      {/* MCQ study session or completion message */}
      {mcqCards.length === 0 ? (
        // Completion state - no cards due
        <div className="text-center py-12 bg-slate-100 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            All Caught Up!
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            You&apos;ve reviewed all due MCQs in this deck.
          </p>
          <Link
            href={`/decks/${deckId}`}
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Deck
          </Link>
        </div>
      ) : (
        <MCQStudySession initialCards={mcqCards} deckId={deckId} />
      )}
    </div>
  )
}
