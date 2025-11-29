'use client'

import { useRouter } from 'next/navigation'
import { CardListItem } from './CardListItem'
import { deleteCard } from '@/actions/card-actions'
import { useToast } from '@/components/ui/Toast'
import type { Card } from '@/types/database'

interface CardListProps {
  cards: Card[]
  deckId: string
}

/**
 * CardList - Client component wrapper for card list with delete handling
 * Requirements: FR-1, FR-3, FR-4
 */
export function CardList({ cards, deckId }: CardListProps) {
  const router = useRouter()
  const { showToast } = useToast()

  const handleDelete = async (cardId: string, preview: string, type: string) => {
    // Truncate preview for confirmation dialog
    const truncatedPreview = preview.length > 80 
      ? preview.substring(0, 80) + '...' 
      : preview

    // Show confirmation dialog (FR-3.1, FR-3.2)
    const confirmed = window.confirm(
      `Delete this ${type}?\n\n"${truncatedPreview}"`
    )

    if (!confirmed) return

    // Call delete action
    const result = await deleteCard(cardId)

    if (result.ok) {
      showToast('Card deleted', 'success')
      router.refresh()
    } else {
      showToast(result.error || 'Could not delete card', 'error')
    }
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-8 bg-slate-100 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg">
        <p className="text-slate-600 dark:text-slate-400">No cards yet</p>
        <p className="text-slate-500 text-sm mt-1">
          Add your first card using the form above!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {cards.map((card) => (
        <CardListItem
          key={card.id}
          card={card}
          deckId={deckId}
          onDelete={handleDelete}
        />
      ))}
    </div>
  )
}
