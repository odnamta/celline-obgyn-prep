import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server'
import { MCQStudySession } from '@/components/study/MCQStudySession'
import type { Card, Deck, MCQCard } from '@/types/database'

interface MCQStudyPageProps {
  params: Promise<{ deckId: string }>
}

/**
 * MCQ Study Page - React Server Component
 * Fetches due MCQ cards for deck and renders MCQ study session.
 * Requirements: 2.1
 */
export default async function MCQStudyPage({ params }: MCQStudyPageProps) {
  const { deckId } = await params
  const user = await getUser()

  if (!user) {
    return null // Layout handles redirect
  }

  const supabase = await createSupabaseServerClient()

  // Fetch deck details (RLS ensures user owns the deck)
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('*')
    .eq('id', deckId)
    .single()

  if (deckError || !deck) {
    notFound()
  }

  // Fetch due MCQ cards (card_type='mcq', next_review <= now)
  const now = new Date().toISOString()
  const { data: dueCards, error: cardsError } = await supabase
    .from('cards')
    .select('*')
    .eq('deck_id', deckId)
    .eq('card_type', 'mcq')
    .lte('next_review', now)
    .order('next_review', { ascending: true })

  const deckData = deck as Deck
  
  // Filter to only valid MCQ cards (with required fields)
  const mcqCards = ((dueCards || []) as Card[]).filter(
    (card): card is MCQCard =>
      card.card_type === 'mcq' &&
      card.stem !== null &&
      card.options !== null &&
      card.correct_index !== null
  )

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
          MCQ Practice: {deckData.title}
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
