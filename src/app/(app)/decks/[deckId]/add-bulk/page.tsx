import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server'
import { Textarea } from '@/components/ui/Textarea'
import { CreateMCQForm } from '@/components/cards/CreateMCQForm'
import { PDFUploadSection } from '@/components/cards/PDFUploadSection'
import { getSourcesForDeck } from '@/actions/source-actions'
import type { Deck } from '@/types/database'

interface BulkImportPageProps {
  params: Promise<{ deckId: string }>
}

/**
 * Bulk Import Page - React Server Component
 * Enhanced UI for PDF-assisted MCQ creation with split-view layout.
 * Requirements: 9.1, 9.4, 10.1, 10.2, 10.3, 10.4
 */
export default async function BulkImportPage({ params }: BulkImportPageProps) {
  const { deckId } = await params
  const user = await getUser()
  
  // Redirect unauthorized users to dashboard
  if (!user) {
    redirect('/dashboard')
  }

  const supabase = await createSupabaseServerClient()

  // Verify user owns deck before rendering
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('*')
    .eq('id', deckId)
    .single()

  // If deck not found or user doesn't own it (RLS), redirect to dashboard
  if (deckError || !deck) {
    redirect('/dashboard')
  }

  const deckData = deck as Deck

  // Fetch linked sources for this deck
  const sources = await getSourcesForDeck(deckId)
  const linkedSource = sources.length > 0 ? sources[0] : null

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Bulk Import MCQs
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Create MCQs quickly by copying from your PDF source materials.
        </p>
      </div>

      {/* PDF Upload Section - Requirements: 9.1, 9.4 */}
      <div className="mb-6">
        <PDFUploadSection deckId={deckId} linkedSource={linkedSource} />
      </div>

      {/* Helper Instructions - Requirements: 10.2 */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
          How to use this page
        </h3>
        <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
          <li>Upload your PDF source document above (optional but recommended)</li>
          <li>Open your PDF in another window or tab</li>
          <li>Copy the question text and paste it into the text area below</li>
          <li>Fill in the MCQ form on the right with the question details</li>
          <li>Repeat for each question you want to add</li>
        </ol>
      </div>

      {/* Split-view layout - Requirements: 10.1, 10.3 */}
      {/* Responsive: side-by-side on large screens, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left side: PDF text paste area */}
        <div className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm dark:shadow-none">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            PDF Text Reference
          </h2>
          
          <Textarea
            label=""
            name="pdfText"
            placeholder="Paste text from your PDF here...

Example:
1. A 32-year-old G2P1 woman at 28 weeks gestation presents with...

A) Option A
B) Option B  
C) Option C
D) Option D

Answer: C

Explanation: The correct answer is C because..."
            className="min-h-[400px] font-mono text-sm"
          />
          
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            This text area is for your reference only. Copy relevant parts to the MCQ form.
          </p>
        </div>

        {/* Right side: MCQ creation form */}
        <div className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm dark:shadow-none">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Create MCQ
          </h2>
          
          <CreateMCQForm deckId={deckId} />
        </div>
      </div>

      {/* Future AI feature placeholder - Requirements: 10.4 */}
      <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-purple-800 dark:text-purple-200">
              AI-Powered MCQ Generation (Coming Soon)
            </h4>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Soon you&apos;ll be able to automatically generate MCQs from your pasted text using AI.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
