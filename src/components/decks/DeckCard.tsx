'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { deleteDeckAction } from '@/actions/deck-actions'
import { Button } from '@/components/ui/Button'
import type { DeckWithDueCount } from '@/types/database'
import { FileEdit } from 'lucide-react'

/**
 * V11.5: Extended deck type with draft count for authors
 */
interface DeckWithDraftCount extends DeckWithDueCount {
  draft_count?: number
  isAuthor?: boolean
}

interface DeckCardProps {
  deck: DeckWithDraftCount
}

/**
 * DeckCard Component
 * V11.5: Added draft count badge for authors
 * **Validates: Requirements 10.2, 10.3, 10.4**
 */
export function DeckCard({ deck }: DeckCardProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this deck? All cards will be removed.')) {
      startTransition(() => {
        deleteDeckAction(deck.id)
      })
    }
  }

  // V11.5: Only show draft badge if user is author and has drafts
  const showDraftBadge = deck.isAuthor && (deck.draft_count ?? 0) > 0

  const handleDraftBadgeClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    router.push(`/decks/${deck.id}?status=draft`)
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-sm dark:shadow-none">
      <div className="flex items-start justify-between gap-4">
        <Link 
          href={`/decks/${deck.id}`}
          className="flex-1 min-w-0"
        >
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 truncate">
            {deck.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {deck.due_count > 0 ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                {deck.due_count} due
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                All caught up
              </span>
            )}
            {/* V11.5: Draft count badge for authors - use button to avoid nested <a> */}
            {showDraftBadge && (
              <button
                type="button"
                onClick={handleDraftBadgeClick}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors"
              >
                <FileEdit className="w-3 h-3" />
                {deck.draft_count} drafts
              </button>
            )}
          </div>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isPending}
        >
          {isPending ? '...' : 'Delete'}
        </Button>
      </div>
    </div>
  )
}
