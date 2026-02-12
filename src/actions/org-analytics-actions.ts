'use server'

/**
 * V16: Org-Level Analytics Server Actions
 *
 * Aggregate stats across all assessments for org admins/creators.
 */

import { withOrgUser } from '@/actions/_helpers'
import { hasMinimumRole } from '@/lib/org-authorization'
import type { ActionResultV2 } from '@/types/actions'

export interface OrgAnalytics {
  totalAssessments: number
  publishedAssessments: number
  totalSessions: number
  completedSessions: number
  timedOutSessions: number
  uniqueCandidates: number
  avgScore: number
  avgPassRate: number
  // Per-assessment breakdown
  assessmentStats: Array<{
    id: string
    title: string
    status: string
    sessions: number
    completedCount: number
    avgScore: number
    passRate: number
  }>
  // Score trend: last 12 weeks
  weeklyTrend: Array<{
    week: string
    avgScore: number
    completions: number
  }>
}

/**
 * Get org-wide analytics summary. Creator+ only.
 */
export async function getOrgAnalytics(): Promise<ActionResultV2<OrgAnalytics>> {
  return withOrgUser(async ({ supabase, org, role }) => {
    if (!hasMinimumRole(role, 'creator')) {
      return { ok: false, error: 'Insufficient permissions' }
    }

    // Get all assessments
    const { data: assessments } = await supabase
      .from('assessments')
      .select('id, title, status')
      .eq('org_id', org.id)

    if (!assessments || assessments.length === 0) {
      return {
        ok: true,
        data: {
          totalAssessments: 0,
          publishedAssessments: 0,
          totalSessions: 0,
          completedSessions: 0,
          timedOutSessions: 0,
          uniqueCandidates: 0,
          avgScore: 0,
          avgPassRate: 0,
          assessmentStats: [],
          weeklyTrend: [],
        },
      }
    }

    const assessmentIds = assessments.map((a) => a.id)

    // Get all sessions for these assessments
    const { data: sessions } = await supabase
      .from('assessment_sessions')
      .select('id, assessment_id, user_id, status, score, passed, completed_at')
      .in('assessment_id', assessmentIds)

    const allSessions = sessions ?? []
    const completed = allSessions.filter((s) => s.status === 'completed' || s.status === 'timed_out')
    const uniqueUsers = new Set(allSessions.map((s) => s.user_id))

    // Overall stats
    const scores = completed.filter((s) => s.score != null).map((s) => s.score as number)
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const passCount = completed.filter((s) => s.passed).length
    const avgPassRate = completed.length > 0 ? Math.round((passCount / completed.length) * 100) : 0

    // Per-assessment breakdown
    const assessmentStats = assessments.map((a) => {
      const aSessions = allSessions.filter((s) => s.assessment_id === a.id)
      const aCompleted = aSessions.filter((s) => s.status === 'completed' || s.status === 'timed_out')
      const aScores = aCompleted.filter((s) => s.score != null).map((s) => s.score as number)
      const aPassCount = aCompleted.filter((s) => s.passed).length

      return {
        id: a.id,
        title: a.title,
        status: a.status,
        sessions: aSessions.length,
        completedCount: aCompleted.length,
        avgScore: aScores.length > 0 ? Math.round(aScores.reduce((x, y) => x + y, 0) / aScores.length) : 0,
        passRate: aCompleted.length > 0 ? Math.round((aPassCount / aCompleted.length) * 100) : 0,
      }
    }).sort((a, b) => b.sessions - a.sessions)

    // Weekly trend — last 12 weeks
    const weeklyTrend: Array<{ week: string; avgScore: number; completions: number }> = []
    const now = new Date()
    for (let w = 11; w >= 0; w--) {
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - w * 7)
      weekStart.setHours(0, 0, 0, 0)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week (Sunday)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const weekSessions = completed.filter((s) => {
        if (!s.completed_at) return false
        const d = new Date(s.completed_at)
        return d >= weekStart && d < weekEnd
      })

      const wScores = weekSessions.filter((s) => s.score != null).map((s) => s.score as number)
      const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`

      weeklyTrend.push({
        week: label,
        avgScore: wScores.length > 0 ? Math.round(wScores.reduce((a, b) => a + b, 0) / wScores.length) : 0,
        completions: weekSessions.length,
      })
    }

    return {
      ok: true,
      data: {
        totalAssessments: assessments.length,
        publishedAssessments: assessments.filter((a) => a.status === 'published').length,
        totalSessions: allSessions.length,
        completedSessions: completed.filter((s) => s.status === 'completed').length,
        timedOutSessions: completed.filter((s) => s.status === 'timed_out').length,
        uniqueCandidates: uniqueUsers.size,
        avgScore,
        avgPassRate,
        assessmentStats,
        weeklyTrend,
      },
    }
  })
}
