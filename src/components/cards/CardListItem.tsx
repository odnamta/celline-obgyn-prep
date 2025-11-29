'use client'

import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import type { Card } from '@/types/database'

interface CardListItemProps {
  card: Card
  deckId: string
  onDelete: (cardId: string, preview: string, type: string) => void
}

/**
 * CardListItem - Displays a single card with Edit/Delete actions
 * Requirements: FR-1
 */
export function CardListItem({ card, deckId, onDelete }: CardListItemProps) {
  const isMCQ = card.card_type === 'mcq'
  const preview = isMCQ ? card.stem : card.front
  const typeLabel = isMCQ ? 'MCQ' : 'Flashcard'

  const handleDeleteClick = () => {
    onDelete(card.id, preview || '', typeLabel)
  }

  return (
    <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm dark:shadow-none">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        {/* Card content */}
        <div className="flex-1 min-w-0">
          <p className="text-slate-900 dark:text-slate-100 line-clamp-2 text-sm">
            {preview}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {/* Card type badge */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
              isMCQ 
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            }`}>
              {typeLabel}
            </span>
            {card.image_url && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                Has image
              </span>
            )}
          </div>
        </div>

        {/* Action buttons - 44px min height for mobile tap targets */}
        <div className="flex gap-2 sm:flex-shrink-0">
          <Link
            href={`/decks/${deckId}/cards/${card.id}/edit`}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </Link>
          <button
            onClick={handleDeleteClick}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>
    </div>
  )
}
