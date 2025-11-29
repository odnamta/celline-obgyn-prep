import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server'
import { EditCardForm } from '@/components/cards/EditCardForm'
import type { Card } from '@/types/database'

interface EditCardPageProps {
  params: Promise<{ deckId: string; cardId: string }>
}

/**
 * Edit Card Page - Server Component
 * Fetches card data and renders edit form
 * Requirements: FR-2
 */
export default async function EditCardPage({ params }: EditCardPageProps) {
  const { deckId, cardId } = await params
  const user = await getUser()

  if (!user) {
    return null // Layout handles redirect
  }

  const supabase = await createSupabaseServerClient()

  // Fetch card with deck ownership check
  const { data: card, error } = await supabase
    .from('cards')
    .select('*, decks!inner(user_id, title)')
    .eq('id', cardId)
    .eq('deck_id', deckId)
    .single()

  if (error || !card) {
    notFound()
  }

  // Verify ownership
  const deckData = card.decks as unknown as { user_id: string; title: string }
  if (deckData.user_id !== user.id) {
    notFound()
  }

  const cardData = card as Card

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header with navigation */}
      <div className="mb-6">
        <Link
          href={`/decks/${deckId}`}
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
        <EditCardForm card={cardData} deckId={deckId} />
      </div>
    </div>
  )
}
