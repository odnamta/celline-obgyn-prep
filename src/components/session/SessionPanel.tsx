'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { formatSessionSummary } from '@/lib/qa-metrics'
import { calculateMissingNumbers } from '@/lib/question-number-detector'

interface SessionPanelProps {
  sessionId: string | null
  draftCount: number
  detectedNumbers: number[]
  savedNumbers: number[]
  /** V11.2.1: Deck ID for fallback navigation to draft view */
  deckId?: string
}

/**
 * V11.3: Session Panel Component
 * Displays current session stats on the BulkImport page.
 * V11.2.1: Updated to use deck draft view as navigation target (no 404)
 * Requirements: 9.1, 9.2
 */
export function SessionPanel({ 
  sessionId, 
  draftCount, 
  detectedNumbers, 
  savedNumbers,
  deckId,
}: SessionPanelProps) {
  if (!sessionId) {
    return null
  }

  const missingNumbers = calculateMissingNumbers(detectedNumbers, savedNumbers)
  const summary = formatSessionSummary(draftCount, detectedNumbers.length, missingNumbers.length)

  // V11.2.1: Use deck draft view as primary navigation target
  // This ensures no 404 and reuses existing working page
  const reviewHref = deckId 
    ? `/decks/${deckId}?showDrafts=true`
    : `/admin/sessions/${sessionId}`

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
        Current Session
      </h3>
      
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
        {summary}
      </p>

      {missingNumbers.length > 0 && missingNumbers.length <= 10 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
          Missing: {missingNumbers.join(', ')}
        </p>
      )}

      {draftCount > 0 && (
        <Link href={reviewHref}>
          <Button size="sm" className="w-full">
            Review & Publish
          </Button>
        </Link>
      )}
    </div>
  )
}
