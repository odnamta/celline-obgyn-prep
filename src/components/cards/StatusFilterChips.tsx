'use client'

import { Send } from 'lucide-react'

export type StatusFilter = 'draft' | 'published' | 'all'

interface StatusFilterChipsProps {
  draftCount: number
  publishedCount: number
  activeFilter: StatusFilter
  onFilterChange: (filter: StatusFilter) => void
  onPublishAllDrafts?: () => void
  isAuthor?: boolean
}

/**
 * V11.4: Status Filter Chips Component
 * Displays filter chips for Draft/Published/All with counts.
 * Shows "Publish all draft cards" button when Draft filter is active.
 * Requirements: 1.1, 4.1
 */
export function StatusFilterChips({
  draftCount,
  publishedCount,
  activeFilter,
  onFilterChange,
  onPublishAllDrafts,
  isAuthor = true,
}: StatusFilterChipsProps) {
  const chips: { filter: StatusFilter; label: string; count: number }[] = [
    { filter: 'draft', label: 'Draft', count: draftCount },
    { filter: 'published', label: 'Published', count: publishedCount },
    { filter: 'all', label: 'All', count: draftCount + publishedCount },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {chips.map(({ filter, label, count }) => (
        <button
          key={filter}
          onClick={() => onFilterChange(filter)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors active:scale-95 ${
            activeFilter === filter
              ? filter === 'draft'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                : filter === 'published'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border border-green-300 dark:border-green-700'
                : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent'
          }`}
        >
          {label}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            activeFilter === filter
              ? 'bg-white/50 dark:bg-black/20'
              : 'bg-slate-200 dark:bg-slate-700'
          }`}>
            {count}
          </span>
        </button>
      ))}

      {/* Publish all drafts button - shown when Draft filter is active and there are drafts */}
      {isAuthor && activeFilter === 'draft' && draftCount > 0 && onPublishAllDrafts && (
        <button
          onClick={onPublishAllDrafts}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 ml-2 rounded-lg text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors active:scale-95"
        >
          <Send className="w-4 h-4" />
          Publish all draft cards
        </button>
      )}
    </div>
  )
}

/**
 * V11.4: Helper to determine default filter based on draft count.
 * Returns 'draft' if there are drafts, otherwise 'all'.
 * Requirements: 1.2, 1.3
 */
export function getDefaultStatusFilter(draftCount: number): StatusFilter {
  return draftCount > 0 ? 'draft' : 'all'
}
