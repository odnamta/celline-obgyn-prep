import { notFound, redirect } from 'next/navigation'
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server'
import { resolveDeckId } from '@/lib/legacy-redirect'
import BulkImportClient from './BulkImportClient'

interface BulkImportPageProps {
  params: Promise<{ deckId: string }>
}

/**
 * V8.2.2/V9.1: Bulk Import Page - Server Component Wrapper
 * Verifies user is the deck author before rendering the client component.
 * Non-authors are redirected to the deck details page.
 * V9.1: Passes deck subject to client for multi-specialty AI support.
 */
export default async function BulkImportPage({ params }: BulkImportPageProps) {
  const { deckId } = await params
  const user = await getUser()

  if (!user) {
    return null // Layout handles redirect
  }

  const supabase = await createSupabaseServerClient()

  // Resolve deck ID (supports legacy redirect)
  const resolved = await resolveDeckId(deckId, supabase)

  if (!resolved) {
    notFound()
  }

  // Redirect if this was a legacy ID
  if (resolved.isLegacy) {
    redirect(`/decks/${resolved.id}/add-bulk`)
  }

  // V9.1: Fetch deck_template including subject for AI
  const { data: deckTemplate, error } = await supabase
    .from('deck_templates')
    .select('id, author_id, subject')
    .eq('id', resolved.id)
    .single()

  if (error || !deckTemplate) {
    notFound()
  }

  // Only authors can access bulk import
  if (deckTemplate.author_id !== user.id) {
    redirect(`/decks/${resolved.id}`)
  }

  // V9.1: Pass subject to client (default to OBGYN if not set)
  const subject = deckTemplate.subject || 'Obstetrics & Gynecology'

  return <BulkImportClient deckId={resolved.id} subject={subject} />
}
