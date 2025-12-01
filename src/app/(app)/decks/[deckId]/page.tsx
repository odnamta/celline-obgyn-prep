import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server'
import { CardFormTabs } from '@/components/cards/CardFormTabs'
import { CardList } from '@/components/cards/CardList'
import { Button } from '@/components/ui/Button'
import type { Card, Deck } from '@/types/database'

interface DeckDetailsPageProps {
  params: Promise<{ deckId: string }>
}

/**
 * Deck Details Page - React Server Component
 * Displays deck info, card list, and form to add new cards.
 * Requirements: 3.1, 3.2, 6.3
 * V7.2.5: Added support for showing V2 migrated cards
 */
export default async function DeckDetailsPage({ params }: DeckDetailsPageProps) {
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

  // V7.2.5: Check if this legacy deck has been migrated to V2
  // If so, fetch cards from card_templates instead of legacy cards table
  const { data: migratedTemplate } = await supabase
    .from('deck_templates')
    .select('id')
    .eq('legacy_id', deckId)
    .single()
  
  let cardList: Card[] = []
  let cardsError: { message: string } | null = null
  
  if (migratedTemplate) {
    // V7.2.5: Fetch V2 cards from card_templates
    const { data: v2Cards, error: v2Error } = await supabase
      .from('card_templates')
      .select('id, stem, options, correct_index, explanation, created_at')
      .eq('deck_template_id', migratedTemplate.id)
      .order('created_at', { ascending: false })
    
    if (v2Error) {
      cardsError = { message: v2Error.message }
    } else {
      // Map V2 card_templates to legacy Card format for CardList compatibility
      cardList = (v2Cards || []).map(ct => ({
        id: ct.id,
        deck_id: deckId,
        card_type: 'mcq' as const,
        front: '',
        back: '',
        stem: ct.stem,
        options: ct.options as string[],
        correct_index: ct.correct_index,
        explanation: ct.explanation,
        image_url: null,
        interval: 1,
        ease_factor: 2.5,
        next_review: new Date().toISOString(),
        created_at: ct.created_at,
      })) as Card[]
    }
  } else {
    // Fetch legacy cards from cards table
    const { data: cards, error } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: false })
    
    if (error) {
      cardsError = { message: error.message }
    } else {
      cardList = (cards || []) as Card[]
    }
  }

  const deckData = deck as Deck

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header with navigation */}
      <div className="mb-6">
        <Link 
          href="/dashboard"
          className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Deck info */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{deckData.title}</h1>
        <p className="text-slate-600 dark:text-slate-400">
          {cardList.length} {cardList.length === 1 ? 'card' : 'cards'} in this deck
        </p>
      </div>

      {/* Action buttons */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Link href={`/study/${deckId}`}>
          <Button size="lg">
            Study Flashcards
          </Button>
        </Link>
        <Link href={`/study/mcq/${deckId}`}>
          <Button size="lg">
            Study MCQs
          </Button>
        </Link>
        {/* Requirement 7.4: Link to bulk import page */}
        <Link href={`/decks/${deckId}/add-bulk`}>
          <Button size="lg" variant="secondary">
            Bulk Import
          </Button>
        </Link>
      </div>

      {/* Add new card form with tabs for flashcard/MCQ */}
      <div className="mb-8 p-4 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm dark:shadow-none">
        <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">Add New Card</h2>
        <CardFormTabs deckId={deckId} />
      </div>

      {/* Card list */}
      <div>
        <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">Cards</h2>
        {cardsError ? (
          <p className="text-red-600 dark:text-red-400">Error loading cards: {cardsError.message}</p>
        ) : (
          <CardList cards={cardList} deckId={deckId} deckTitle={deckData.title} />
        )}
      </div>
    </div>
  )
}
