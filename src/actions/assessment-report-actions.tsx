'use server'

import { renderToBuffer } from '@react-pdf/renderer'
import { AssessmentResultsPDF, type AssessmentResultsData } from '@/lib/assessment-results-pdf'
import { withOrgUser } from '@/actions/_helpers'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { hasMinimumRole } from '@/lib/org-authorization'
import type { ActionResultV2 } from '@/types/actions'

/**
 * Export an assessment's aggregate results as a PDF report.
 * Renders the PDF, uploads to Supabase Storage, returns a signed URL (7-day expiry).
 * Requires creator+ role.
 */
export async function exportAssessmentResultsPdf(
  assessmentId: string
): Promise<ActionResultV2<{ url: string }>> {
  return withOrgUser(async ({ supabase, org, role }) => {
    if (!hasMinimumRole(role, 'creator')) {
      return { ok: false, error: 'Insufficient permissions' }
    }

    // Fetch assessment
    const { data: assessment } = await supabase
      .from('assessments')
      .select('id, title, question_count, time_limit_minutes, pass_score, org_id')
      .eq('id', assessmentId)
      .eq('org_id', org.id)
      .single()

    if (!assessment) {
      return { ok: false, error: 'Assessment not found' }
    }

    // Fetch completed sessions with user info
    const { data: sessions } = await supabase
      .from('assessment_sessions')
      .select('id, user_id, score, passed, status, completed_at, profiles!inner(full_name, email)')
      .eq('assessment_id', assessmentId)
      .in('status', ['completed', 'timed_out'])
      .order('completed_at', { ascending: false })

    const completedSessions = sessions ?? []

    // Compute stats
    const totalAttempts = completedSessions.length
    const scores = completedSessions.map(s => s.score).filter((s): s is number => s !== null)
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0

    // Median
    const sorted = [...scores].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const medianScore = sorted.length === 0
      ? 0
      : sorted.length % 2 !== 0
        ? sorted[mid]
        : Math.round((sorted[mid - 1] + sorted[mid]) / 2)

    const passedCount = completedSessions.filter(s => s.passed).length
    const passRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0

    // Score distribution
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      range: i === 0 ? '0-10' : `${i * 10 + 1}-${(i + 1) * 10}`,
      count: 0,
    }))
    for (const score of scores) {
      const idx = Math.min(Math.floor(score / 10), 9)
      buckets[idx].count++
    }

    // Top and bottom performers
    const sortedByScore = [...completedSessions].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    const topPerformers = sortedByScore.slice(0, 5).map(s => {
      const profile = s.profiles as unknown as { full_name: string | null; email: string }
      return {
        name: profile.full_name || profile.email,
        score: s.score ?? 0,
        passed: s.passed ?? false,
      }
    })
    const bottomPerformers = [...completedSessions]
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
      .slice(0, 5)
      .map(s => {
        const profile = s.profiles as unknown as { full_name: string | null; email: string }
        return {
          name: profile.full_name || profile.email,
          score: s.score ?? 0,
          passed: s.passed ?? false,
        }
      })

    // Question analytics
    const { data: questionData } = await supabase
      .from('assessment_answers')
      .select('card_template_id, is_correct, card_templates!inner(front_text)')
      .eq('assessment_id', assessmentId)

    const questionMap = new Map<string, { stem: string; total: number; correct: number }>()
    for (const answer of questionData ?? []) {
      const card = answer.card_templates as unknown as { front_text: string }
      const existing = questionMap.get(answer.card_template_id) ?? {
        stem: card.front_text,
        total: 0,
        correct: 0,
      }
      existing.total++
      if (answer.is_correct) existing.correct++
      questionMap.set(answer.card_template_id, existing)
    }

    const questionStats = Array.from(questionMap.values()).map(q => ({
      stem: q.stem.length > 80 ? q.stem.slice(0, 77) + '...' : q.stem,
      totalAttempts: q.total,
      percentCorrect: q.total > 0 ? Math.round((q.correct / q.total) * 100) : 0,
    }))

    // Build report data
    const reportData: AssessmentResultsData = {
      orgName: org.name,
      primaryColor: org.settings?.branding?.primary_color,
      assessmentTitle: assessment.title,
      questionCount: assessment.question_count,
      timeLimitMinutes: assessment.time_limit_minutes,
      passScore: assessment.pass_score,
      reportDate: new Date().toISOString(),
      totalAttempts,
      avgScore,
      medianScore,
      passRate,
      topPerformers,
      bottomPerformers,
      scoreDistribution: buckets,
      questionStats,
    }

    // Render PDF
    const pdfBuffer = await renderToBuffer(<AssessmentResultsPDF data={reportData} />)

    // Upload to Supabase Storage
    const serviceClient = await createSupabaseServiceClient()
    const filePath = `reports/${org.id}/assessments/${assessmentId}/${Date.now()}.pdf`

    const { error: uploadError } = await serviceClient.storage
      .from('certificates')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      return { ok: false, error: `Upload failed: ${uploadError.message}` }
    }

    // Create signed URL (7-day expiry)
    const { data: urlData } = await serviceClient.storage
      .from('certificates')
      .createSignedUrl(filePath, 7 * 24 * 60 * 60)

    const url = urlData?.signedUrl ?? ''

    return { ok: true, data: { url } }
  })
}
