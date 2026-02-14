export const metadata = { title: 'Flashcard Study' }

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server'
import { StudySession } from './StudySession'
import { resolveDeckId } from '@/lib/legacy-redirect'
import type { Card, UserStats, CardTemplate, UserCardProgress } from '@/types/database'

interface StudyPageProps {
  params: Promise<{ deckId: string }>
}

/**
 * V8.1: Study Page - React Server Component
 * Fetches due cards from user_card_progress joined with card_templates.
 * Supports legacy ID redirect for old bookmarks.
 * Requirements: 5.1, 5.5, V8 2.5, V8.1 Fix 1
 */
export default async function StudyPage({ params }: StudyPageProps) {
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
    redirect(`/study/${resolved.id}`)
  }

  // Fetch deck_template data
  const { data: deckTemplate, error: deckError } = await supabase
    .from('deck_templates')
    .select('id, title')
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

  // Also check if user is author
  const { data: authorCheck } = await supabase
    .from('deck_templates')
    .select('author_id')
    .eq('id', deckId)
    .single()

  const isAuthor = authorCheck?.author_id === user.id
  if (!userDeck && !isAuthor) {
    notFound()
  }

  // V8.0: Fetch due cards from user_card_progress joined with card_templates
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

  // Fetch user stats for session summary
  const { data: userStats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Map to Card format for StudySession compatibility
  const cardList: Card[] = (dueProgress || []).map(record => {
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
      image_url: null,
      interval: progress.interval,
      ease_factor: progress.ease_factor,
      next_review: progress.next_review,
      created_at: ct.created_at,
    }
  }) as Card[]

  const userStatsData = userStats as UserStats | null

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
          Studying: {deckTemplate.title}
        </h1>
        {cardsError ? (
          <p className="text-red-600 dark:text-red-400">Error loading cards: {cardsError.message}</p>
        ) : (
          <p className="text-slate-600 dark:text-slate-400">
            {cardList.length} {cardList.length === 1 ? 'card' : 'cards'} due for review
          </p>
        )}
      </div>

      {/* Study session or completion message */}
      {cardList.length === 0 ? (
        // Completion state - Requirement 5.5
        <div className="text-center py-12 bg-slate-100 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Study Session Complete!
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            You&apos;ve reviewed all due cards in this deck.
          </p>
          <Link 
            href={`/decks/${deckId}`}
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Deck
          </Link>
        </div>
      ) : (
        <StudySession initialCards={cardList} deckId={deckId} userStats={userStatsData} />
      )}
    </div>
  )
}
