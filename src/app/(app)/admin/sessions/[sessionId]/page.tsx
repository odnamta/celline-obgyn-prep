export const metadata = { title: 'Session Review' }

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/supabase/server'
import { getSessionCards } from '@/actions/session-actions'
import { SessionReviewHeader } from '@/components/session/SessionReviewHeader'
import { SessionReviewTable } from '@/components/session/SessionReviewTable'

interface SessionReviewPageProps {
  params: Promise<{ sessionId: string }>
}

/**
 * V11.3: Session Review Page
 * Admin-only page for reviewing and publishing cards from an import session.
 * Requirements: 4.1, 4.5
 */
export default async function SessionReviewPage({ params }: SessionReviewPageProps) {
  const { sessionId } = await params
  const user = await getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch session data
  const result = await getSessionCards(sessionId)
  
  if (!result.ok || !result.cards || !result.sessionMeta) {
    if (result.error?.code === 'UNAUTHORIZED') {
      redirect('/dashboard')
    }
    notFound()
  }

  const { cards, sessionMeta } = result

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Navigation */}
      <div className="mb-6">
        <Link 
          href="/dashboard"
          className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Header with session info and QA metrics */}
      <SessionReviewHeader sessionMeta={sessionMeta} cardCount={cards.length} />

      {/* Card table with selection and actions */}
      <SessionReviewTable 
        cards={cards} 
        sessionId={sessionId}
        sessionMeta={sessionMeta}
      />
    </div>
  )
}
